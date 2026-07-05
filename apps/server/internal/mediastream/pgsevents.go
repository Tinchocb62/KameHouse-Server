package mediastream

import (
	"encoding/binary"
	"fmt"
	"image/png"
	"io"
	"os"

	"kamehouse/internal/pgs"
)

type PgsEvent struct {
	StartTime    float64 `json:"startTime"`
	Duration     float64 `json:"duration"`
	ImageData    string  `json:"imageData"`
	Width        int     `json:"width"`
	Height       int     `json:"height"`
	X            int     `json:"x"`
	Y            int     `json:"y"`
	CanvasWidth  int     `json:"canvasWidth"`
	CanvasHeight int     `json:"canvasHeight"`
	CropX        int     `json:"cropX,omitempty"`
	CropY        int     `json:"cropY,omitempty"`
	CropWidth    int     `json:"cropWidth,omitempty"`
	CropHeight   int     `json:"cropHeight,omitempty"`
}

func ParseSupFile(path string) ([]*PgsEvent, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	decoder := pgs.NewPgsDecoder()
	var events []*PgsEvent
	var lastEvent *PgsEvent

	for {
		// Read Magic
		magic := make([]byte, 2)
		if _, err := io.ReadFull(file, magic); err != nil {
			if err == io.EOF {
				break
			}
			return nil, err
		}
		if magic[0] != 0x50 || magic[1] != 0x47 { // 'P', 'G'
			return nil, fmt.Errorf("invalid sup magic: %x %x", magic[0], magic[1])
		}

		// Read PTS (4 bytes)
		ptsBytes := make([]byte, 4)
		if _, err := io.ReadFull(file, ptsBytes); err != nil {
			return nil, err
		}
		pts := binary.BigEndian.Uint32(ptsBytes)

		// Read DTS (4 bytes)
		dtsBytes := make([]byte, 4)
		if _, err := io.ReadFull(file, dtsBytes); err != nil {
			return nil, err
		}

		// Read Segment Type (1 byte)
		segType := make([]byte, 1)
		if _, err := io.ReadFull(file, segType); err != nil {
			return nil, err
		}

		// Read Segment Size (2 bytes)
		segSize := make([]byte, 2)
		if _, err := io.ReadFull(file, segSize); err != nil {
			return nil, err
		}
		size := binary.BigEndian.Uint16(segSize)

		// Read Segment Data
		data := make([]byte, size)
		if _, err := io.ReadFull(file, data); err != nil {
			return nil, err
		}

		// Reconstruct raw packet for pgs.DecodePacket: type(1) + size(2) + data(size)
		packet := make([]byte, 3+size)
		packet[0] = segType[0]
		copy(packet[1:3], segSize)
		copy(packet[3:], data)

		startTime := float64(pts) / 90000.0

		img, err := decoder.DecodePacket(packet)
		if err != nil {
			continue // Skip errors
		}

		if decoder.IsClearCommand() {
			if lastEvent != nil {
				dur := startTime - lastEvent.StartTime
				if dur > 0 {
					lastEvent.Duration = dur
				}
				lastEvent = nil
			}
			continue
		}

		if img != nil {
			if lastEvent != nil {
				dur := startTime - lastEvent.StartTime
				if dur > 0 {
					lastEvent.Duration = dur
				}
			}

			encodedImage, err := pgs.EncodePgsImageToBase64PNG(img, png.BestSpeed)
			if err != nil {
				continue
			}

			event := &PgsEvent{
				StartTime: startTime,
				ImageData: encodedImage,
				Width:     img.Bounds().Dx(),
				Height:    img.Bounds().Dy(),
			}

			if comp := decoder.GetCurrentComposition(); comp != nil {
				event.CanvasWidth = int(comp.Width)
				event.CanvasHeight = int(comp.Height)
				if len(comp.Objects) > 0 {
					obj := comp.Objects[0]
					event.X = int(obj.X)
					event.Y = int(obj.Y)
					if obj.Cropped {
						event.CropX = int(obj.CropX)
						event.CropY = int(obj.CropY)
						event.CropWidth = int(obj.CropWidth)
						event.CropHeight = int(obj.CropHeight)
					}
				}
			}

			events = append(events, event)
			lastEvent = event
		}
	}

	return events, nil
}
