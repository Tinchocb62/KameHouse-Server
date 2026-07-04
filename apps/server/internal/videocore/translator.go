package videocore

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"kamehouse/internal/mkvparser"
	httputil "kamehouse/internal/util/http"
	"kamehouse/internal/util/result"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/5rahim/go-astisub"
	"github.com/rs/zerolog"
	"github.com/samber/lo"
)

// Translator implemented by different providers
type Translator interface {
	TranslateBatch(ctx context.Context, texts []string, targetLang string) ([]string, error)
}

type TranslatorService struct {
	cache      *result.BoundedCache[string, string]
	translator Translator
	targetLang string
	vc         *VideoCore
	logSampler *zerolog.Logger
	queue      chan request
	close      chan struct{}
	closeOnce  sync.Once
}

func NewTranslatorService(vc *VideoCore, apiKey string, provider string, targetLang string) *TranslatorService {
	var t Translator
	switch provider {
	case "openai":
		t = &OpenAITranslator{Token: apiKey, client: httputil.NewClientWithTimeout(30 * time.Second), logger: vc.logger}
	case "deepl":
		t = &DeepLTranslator{Token: apiKey, client: httputil.NewFastClient(), logger: vc.logger}
	default:
		t = NewFreeGoogleTranslator(vc.logger)
	}

	s := &TranslatorService{
		vc:         vc,
		translator: t,
		targetLang: targetLang,
		cache:      result.NewBoundedCache[string, string](10000),
		queue:      make(chan request, 1000),
		close:      make(chan struct{}),
		logSampler: lo.ToPtr(vc.logger.Sample(&zerolog.BasicSampler{N: 500})),
	}

	go s.processQueue()

	return s
}

func (s *TranslatorService) Shutdown() {
	s.closeOnce.Do(func() {
		close(s.close)
	})
}

func (s *TranslatorService) TranslateContent(ctx context.Context, content string, format int, targetLang string) (string, error) {
	s.vc.logger.Debug().Msgf("videocore: Translating content of type %d to %s", format, targetLang)
	reader := strings.NewReader(content)
	var subs *astisub.Subtitles
	var err error

read:
	switch format {
	case mkvparser.SubtitleTypeASS:
		subs, err = astisub.ReadFromSSA(reader)
	case mkvparser.SubtitleTypeSSA:
		subs, err = astisub.ReadFromSSA(reader)
	case mkvparser.SubtitleTypeSRT:
		subs, err = astisub.ReadFromSRT(reader)
	case mkvparser.SubtitleTypeSTL:
		subs, err = astisub.ReadFromSTL(reader, astisub.STLOptions{IgnoreTimecodeStartOfProgramme: true})
	case mkvparser.SubtitleTypeTTML:
		subs, err = astisub.ReadFromTTML(reader)
	case mkvparser.SubtitleTypeWEBVTT:
		subs, err = astisub.ReadFromWebVTT(reader)
	case mkvparser.SubtitleTypeUnknown:
		detectedType := mkvparser.DetectSubtitleType(content)
		if detectedType == mkvparser.SubtitleTypeUnknown {
			s.vc.logger.Error().Msg("videocore: Failed to detect subtitle format")
			return "", fmt.Errorf("failed to detect subtitle format")
		}
		format = detectedType
		reader = strings.NewReader(content)
		goto read
	default:
		s.vc.logger.Error().Msgf("videocore: Unsupported subtitle format: %d", format)
		return "", fmt.Errorf("unsupported subtitle format: %d", format)
	}

	if err != nil {
		s.vc.logger.Error().Err(err).Msg("videocore: Failed to parse subtitles")
		return "", fmt.Errorf("parsing failed: %w", err)
	}

	type lineRef struct {
		itemIndex int
		cleaned   string
	}

	var linesToTranslate []lineRef

	// Scan items, check cache, and queue missing lines
	for i, item := range subs.Items {
		var textBuilder strings.Builder
		for _, line := range item.Lines {
			for _, lineItem := range line.Items {
				textBuilder.WriteString(lineItem.Text)
			}
			textBuilder.WriteString(" ")
		}
		fullText := strings.TrimSpace(textBuilder.String())

		if fullText == "" {
			continue
		}

		cleaned := cleanSubtitleText(fullText)
		cacheKey := generateCacheKey(cleaned, targetLang)

		if val, ok := s.cache.Get(cacheKey); ok {
			// Cache hit, update immediately
			updateItemText(item, val)
		} else {
			// Cache miss, queue it
			linesToTranslate = append(linesToTranslate, lineRef{
				itemIndex: i,
				cleaned:   cleaned,
			})
		}
	}

	// Process in batches
	batchSize := 50
	totalNeeded := len(linesToTranslate)

	for start := 0; start < totalNeeded; start += batchSize {
		end := start + batchSize
		if end > totalNeeded {
			end = totalNeeded
		}

		var batchTexts []string
		for k := start; k < end; k++ {
			batchTexts = append(batchTexts, linesToTranslate[k].cleaned)
		}

		translatedBatch, err := s.translator.TranslateBatch(ctx, batchTexts, targetLang)
		if err != nil {
			s.vc.logger.Error().Err(err).Msgf("videocore: Failed to translate batch at index %d", start)
			return "", fmt.Errorf("batch translation failed at index %d: %w", start, err)
		}

		// Map results back to original items and cache
		for k, translatedText := range translatedBatch {
			originalRef := linesToTranslate[start+k]

			cacheKey := generateCacheKey(originalRef.cleaned, targetLang)
			s.cache.Set(cacheKey, translatedText)

			updateItemText(subs.Items[originalRef.itemIndex], translatedText)
		}
	}

	s.vc.logger.Debug().Msgf("videocore: Translated %d lines", len(linesToTranslate))

	// Write output
	w := &bytes.Buffer{}
	switch format {
	case mkvparser.SubtitleTypeSSA, mkvparser.SubtitleTypeASS:
		err = subs.WriteToSSA(w)
	case mkvparser.SubtitleTypeSRT:
		err = subs.WriteToSRT(w)
	case mkvparser.SubtitleTypeSTL:
		err = subs.WriteToSTL(w)
	case mkvparser.SubtitleTypeTTML:
		err = subs.WriteToTTML(w)
	case mkvparser.SubtitleTypeWEBVTT:
		err = subs.WriteToWebVTT(w)
	default:
		err = subs.WriteToWebVTT(w)
	}

	if err != nil {
		s.vc.logger.Error().Err(err).Msg("videocore: Failed to write subtitles")
		return "", fmt.Errorf("failed to write subtitles: %w", err)
	}

	return w.String(), nil
}

// TranslateEvent handles single subtitle events from the mkv parser
func (s *TranslatorService) TranslateEvent(ctx context.Context, evt *mkvparser.SubtitleEvent, targetLang string) error {
	clean := cleanSubtitleText(evt.Text)
	if clean == "" {
		return nil
	}

	cacheKey := generateCacheKey(clean, targetLang)
	if val, ok := s.cache.Get(cacheKey); ok {
		evt.Text = val
		return nil
	}

	resCh := make(chan textResult, 1)

	select {
	case s.queue <- request{text: clean, targetLang: targetLang, resultChan: resCh}:
	case <-ctx.Done():
		return ctx.Err()
	}

	// block until the batch processor finishes (or timeout)
	select {
	case res := <-resCh:
		if res.err != nil {
			s.logSampler.Error().Err(res.err).Msg("videocore: Failed to translate subtitle event")
			return res.err
		}
		// save to cache
		s.cache.Set(cacheKey, res.text)
		evt.Text = res.text
		s.logSampler.Debug().Msgf("videocore: Translated subtitle event: %s", evt.Text)
		return nil
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(15 * time.Second):
		return fmt.Errorf("translation timed out")
	}
}

func (s *TranslatorService) TranslateText(ctx context.Context, text string, targetLang string) (string, error) {
	clean := cleanSubtitleText(text)
	if clean == "" {
		return "", nil
	}

	cacheKey := generateCacheKey(clean, targetLang)
	if val, ok := s.cache.Get(cacheKey); ok {
		return val, nil
	}

	resCh := make(chan textResult, 1)

	select {
	case s.queue <- request{text: clean, targetLang: targetLang, resultChan: resCh}:
	case <-ctx.Done():
		return "", ctx.Err()
	}

	// block until the batch processor finishes (or timeout)
	select {
	case res := <-resCh:
		if res.err != nil {
			s.logSampler.Error().Err(res.err).Msg("videocore: Failed to translate text")
			return "", res.err
		}
		// save to cache
		s.cache.Set(cacheKey, res.text)
		s.logSampler.Debug().Msgf("videocore: Translated text: %s", res.text)
		return res.text, nil
	case <-ctx.Done():
		return "", ctx.Err()
	case <-time.After(15 * time.Second):
		return "", fmt.Errorf("translation timed out")
	}
}

//func (s *TranslatorService) TranslateEvent(ctx context.Context, evt *mkvparser.SubtitleEvent, targetLang string) error {
//	clean := cleanSubtitleText(evt.Text)
//	if clean == "" {
//		return nil
//	}
//
//	key := generateCacheKey(clean, targetLang)
//	if val, ok := s.cache.Load(key); ok {
//		evt.Text = val.(string)
//		return nil
//	}
//
//	tr, err := s.translator.TranslateBatch(ctx, []string{clean}, targetLang)
//	if err != nil || len(tr) == 0 {
//		s.logSampler.Error().Err(err).Msg("videocore: Failed to translate subtitle event")
//		return err
//	}
//
//	s.cache.Store(key, tr[0])
//	evt.Text = tr[0]
//	s.logSampler.Debug().Msgf("videocore: Translated subtitle event: %s", evt.Text)
//	return nil
//}

type request struct {
	text       string
	targetLang string
	resultChan chan textResult // The channel where we will send the answer
}

type textResult struct {
	text string
	err  error
}

func (s *TranslatorService) processQueue() {
	const maxBatchSize = 50
	const batchTimeout = 100 * time.Millisecond // Wait max to fill a batch

	// buffer holds the current batch of requests
	buffer := make([]request, 0, maxBatchSize)

	// Helper to flush the buffer
	flush := func() {
		if len(buffer) == 0 {
			return
		}
		// Copy buffer to separate slice to process async (so we don't block the queue)
		batch := make([]request, len(buffer))
		copy(batch, buffer)
		buffer = buffer[:0] // Reset buffer

		go s.executeBatch(batch)
	}

	ticker := time.NewTicker(batchTimeout)
	defer ticker.Stop()

	for {
		select {
		case req := <-s.queue:
			buffer = append(buffer, req)
			// If bus is full, leave immediately
			if len(buffer) >= maxBatchSize {
				flush()
				ticker.Reset(batchTimeout) // Reset timer since we just flushed
			}

		case <-ticker.C:
			// Timer expired, leave with whatever we have
			flush()

		case <-s.close:
			return
		}
	}
}

// executeBatch performs the actual API call
func (s *TranslatorService) executeBatch(batch []request) {
	if len(batch) == 0 {
		return
	}

	// We assume all in this batch target the same language
	targetLang := batch[0].targetLang
	texts := make([]string, len(batch))

	for i, req := range batch {
		texts[i] = req.text
	}

	// Call the API
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	translatedTexts, err := s.translator.TranslateBatch(ctx, texts, targetLang)

	// Distribute results back to the waiters
	for i, req := range batch {
		if err != nil {
			req.resultChan <- textResult{err: err}
		} else if i < len(translatedTexts) {
			req.resultChan <- textResult{text: translatedTexts[i]}
		} else {
			req.resultChan <- textResult{err: fmt.Errorf("missing translation result")}
		}
		close(req.resultChan)
	}
}

func updateItemText(item *astisub.Item, text string) {
	item.Lines = []astisub.Line{{
		Items: []astisub.LineItem{{
			Text: text,
		}},
	}}
}

func generateCacheKey(text, lang string) string {
	hash := sha256.Sum256([]byte(text + "|" + lang))
	return hex.EncodeToString(hash[:])
}

func cleanSubtitleText(input string) string {
	// Removes ASS tags like {\an8}
	re := regexp.MustCompile(`\{.*?\}`)
	return strings.TrimSpace(re.ReplaceAllString(input, ""))
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// TranslateContent translates the file content based on saved settings
func (vc *VideoCore) TranslateContent(ctx context.Context, content string, format int) string {
	return content
}

// TranslateEvent translates the subtitle event based on saved settings
func (vc *VideoCore) TranslateEvent(ctx context.Context, event *mkvparser.SubtitleEvent) {
}

// TranslateText translates the text based on saved settings
func (vc *VideoCore) TranslateText(ctx context.Context, text string) string {
	return text
}

func (vc *VideoCore) GetTranslationTargetLanguage() string {
	return ""
}
