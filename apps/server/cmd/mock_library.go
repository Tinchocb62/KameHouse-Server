package main

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"kamehouse/internal/database/db"
	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/library/filesystem"
)

func main() {
	if err := db.Initialize("kamehouse.db"); err != nil {
		log.Fatalf("failed to open database: %v", err)
	}

	database := db.GetDatabase()

	lfs := make([]*dto.LocalFile, 0)
	baseTime := time.Now()

	fmt.Println("Generating 5000 mock elements...")

	for i := 1; i <= 5000; i++ {
		fakePath := fmt.Sprintf("C:/mock_library/Mock Series %d/Season 1/S01E01.mkv", i)

		metadata := &dto.LocalFileMetadata{
			Title:         fmt.Sprintf("Mock Series %d", i),
			Year:          2026,
			Resolution:    "1080p",
			VideoCodec:    "h264",
			AudioCodec:    "aac",
			ParsedEpisode: 1,
			ParsedSeason:  1,
		}

		lf := &dto.LocalFile{
			Path:      fakePath,
			Name:      fmt.Sprintf("Mock Series %d - S01E01", i),
			Extension: ".mkv",
			Size:      int64(1024 * 1024 * 500), // 500MB
			CreatedAt: baseTime,
			UpdatedAt: baseTime,
			Metadata:  metadata,
			Locked:    false,
			Ignored:   false,
			MediaId:   i,
		}
		lfs = append(lfs, lf)
	}

	fmt.Println("Inserting to DB...")
	_, err := db.InsertLocalFiles(database, lfs)
	if err != nil {
		log.Fatalf("failed to insert: %v", err)
	}

	fmt.Println("Mock injection complete. Total: 5000 elements added.")
}
