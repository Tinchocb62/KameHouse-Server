package db

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/rs/zerolog"
	"github.com/samber/mo"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"

	"kamehouse/internal/database/models"
	"kamehouse/internal/database/models/dto"
	"kamehouse/internal/util/result"
)

type Database struct {
	gormdb                   *gorm.DB
	Logger                   *zerolog.Logger
	CurrMediaFillers         mo.Option[map[int]*MediaFillerItem]
	cleanupManager           *CleanupManager
	bufferedWriter           *BufferedWriter
	OnError                  func(error)
	LibraryMediaCache        sync.Map // L1 read cache scoped to the database instance
	MediaIDMappingCache      *result.Map[string, *models.MediaIDMapping]
	OnlinestreamMappingCache *result.Map[string, *models.OnlinestreamMapping]
	slowTraceLogger          *SlowTraceLogger
}

func (db *Database) SetOnError(f func(error)) {
	db.OnError = f
	if db.bufferedWriter != nil {
		db.bufferedWriter.OnError = f
	}
}

func (db *Database) Gorm() *gorm.DB {
	return db.gormdb
}

// NewDatabase initializes the SQLite connection pool with WAL mode and runs
// migración de esquema (DDL) de forma síncrona. La migración de datos
// heredados (DML) se delega a runDataMigrations en segundo plano.
func NewDatabase(ctx context.Context, appDataDir, dbName string, logger *zerolog.Logger) (*Database, error) {
	var sqlitePath string
	if os.Getenv("TEST_ENV") == "true" || appDataDir == "" {
		sqlitePath = ":memory:"
	} else {
		sqlitePath = filepath.Join(appDataDir, dbName+".db")
	}

	cacheSize := "-32000"
	if envCache := os.Getenv("KAMEHOUSE_DB_CACHE_SIZE"); envCache != "" {
		cacheSize = envCache
	}
	mmapSize := "134217728"
	if envMmap := os.Getenv("KAMEHOUSE_DB_MMAP_SIZE"); envMmap != "" {
		mmapSize = envMmap
	}

	// glebarez/sqlite uses _pragma=name(value) syntax (not mattn/go-sqlite3 style).
	// All pragmas in the DSN are applied to every connection opened by the pool.
	//
	//  journal_mode=WAL        → writers don't block readers; much better concurrency.
	//  busy_timeout=5000       → wait up to 5 s before returning SQLITE_BUSY.
	//  synchronous=NORMAL      → fsync only at WAL checkpoints, not every commit.
	//  cache_size              → per-connection page cache (reduces repeated I/O).
	//  mmap_size               → memory-mapped I/O for read-heavy workloads.
	//  journal_size_limit      → caps WAL file growth to 64 MiB.
	dsn := fmt.Sprintf(
		"%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=synchronous(NORMAL)&_pragma=cache_size(%s)&_pragma=mmap_size(%s)&_pragma=journal_size_limit(67108864)",
		sqlitePath, cacheSize, mmapSize,
	)

	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: gormlogger.New(
			logger,
			gormlogger.Config{
				SlowThreshold:             time.Second,
				LogLevel:                  gormlogger.Error,
				IgnoreRecordNotFoundError: true,
				ParameterizedQueries:      false,
				Colorful:                  true,
			},
		),
		PrepareStmt:            true,
		SkipDefaultTransaction: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to obtain underlying sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(4)
	sqlDB.SetMaxIdleConns(2)
	sqlDB.SetConnMaxLifetime(time.Hour)

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("database ping fail or connection timeout: %w", err)
	}

	// DDL síncrono: esquema e índices
	if err := migrateSchema(ctx, db); err != nil {
		logger.Fatal().Err(err).Msg("db: Failed to perform auto migration. Schema out of date.")
		return nil, err
	}

	logger.Info().Str("name", fmt.Sprintf("%s.db", dbName)).Msg("db: Database instantiated and migrated")

	database := &Database{
		gormdb:                   db,
		Logger:                   logger,
		CurrMediaFillers:         mo.None[map[int]*MediaFillerItem](),
		MediaIDMappingCache:      result.NewMap[string, *models.MediaIDMapping](),
		OnlinestreamMappingCache: result.NewMap[string, *models.OnlinestreamMapping](),
	}

	database.cleanupManager = NewCleanupManager(database.gormdb, database.Logger)
	database.bufferedWriter = NewBufferedWriter(database.gormdb, database.Logger, 100, 300*time.Millisecond)

	logDir := appDataDir
	if logDir == "" {
		logDir = os.TempDir()
	}
	slowTraceLogger := NewSlowTraceLogger(logDir, 500*time.Millisecond)
	slowTraceLogger.RegisterCallbacks(db)
	database.slowTraceLogger = slowTraceLogger

	// DML síncrono: migración de datos legacy antes de aceptar peticiones
	database.runDataMigrations()

	// Start background WAL checkpointing ticker (every 5 minutes)
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				database.gormdb.Exec("PRAGMA wal_checkpoint(PASSIVE);")
			}
		}
	}()

	return database, nil
}

// EnqueueWrite añade una operación de escritura asíncrona al ring buffer.
func (db *Database) EnqueueWrite(op DbWriteOperation) {
	if db.bufferedWriter != nil {
		db.bufferedWriter.Enqueue(op)
	} else {
		db.Logger.Warn().Msg("db: EnqueueWrite fallback to synchronous operation because bufferedWriter is nil")
		if err := op(db.gormdb); err != nil {
			db.Logger.Error().Err(err).Msg("db: EnqueueWrite fallback operation failed")
			if db.OnError != nil {
				db.OnError(err)
			}
		}
	}
}

// Shutdown cierra gracefulmente todas las operaciones de base de datos pendientes.
func (db *Database) Shutdown() {
	if db.bufferedWriter != nil {
		db.bufferedWriter.Shutdown()
	}
	if db.slowTraceLogger != nil {
		db.slowTraceLogger.Flush()
	}
	// TRUNCATE waits for all readers and resets the WAL to zero length, so the
	// next startup has nothing to replay and begins faster than with PASSIVE.
	db.gormdb.Exec("PRAGMA wal_checkpoint(TRUNCATE);")
}

// Checkpoint performs a WAL checkpoint (PASSIVE mode).
func (db *Database) Checkpoint() {
	if err := db.gormdb.Exec("PRAGMA wal_checkpoint(PASSIVE);").Error; err != nil {
		db.Logger.Error().Err(err).Msg("db: Failed to execute WAL checkpoint")
	}
}

// Close libera el pool de conexiones subyacente.
func (db *Database) Close() error {
	sqlDB, err := db.gormdb.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// runDataMigrations ejecuta migraciones de datos (DML) en segundo plano
// una vez que el pool WAL está activo y el servidor web responde peticiones.
func (db *Database) runDataMigrations() {
	defer func() {
		if r := recover(); r != nil {
			db.Logger.Error().Interface("panic", r).Msg("db: panic en runDataMigrations")
		}
	}()

	db.Logger.Info().Msg("db: iniciando migraciones de datos")
	if err := migrateLegacyLocalFiles(db.gormdb); err != nil {
		db.Logger.Error().Err(err).Msg("db: fallo en migración de datos legacy LocalFiles -> LocalFile")
		return
	}
	migrateDefaultSettings(db.gormdb, db.Logger)
	db.Logger.Info().Msg("db: migraciones de datos completadas")
}

// migrateSchema ejecuta exclusivamente operaciones DDL (AutoMigrate + índices)
// de forma síncrona durante el inicio. No contiene lógica de migración de datos.
func migrateSchema(ctx context.Context, db *gorm.DB) error {
	// Limpia duplicados de LibraryMedia (los TMDB ID deben ser únicos POR TIPO)
	db.Exec(`
		DELETE FROM library_media
		WHERE tmdb_id IS NOT NULL
		  AND tmdb_id != 0
		  AND id NOT IN (
			SELECT MIN(id)
			FROM library_media
			WHERE tmdb_id IS NOT NULL AND tmdb_id != 0
			GROUP BY tmdb_id, type
		  )
		`)

	if err := db.WithContext(ctx).AutoMigrate(
		&models.LocalFile{},
		&models.Settings{},
		&models.Account{},
		&models.ScanSummary{},

		&models.SilencedMediaEntry{},
		&models.Theme{},

		&models.MediastreamSettings{},
		&models.MediaFiller{},
		&models.MediaMetadataParent{},
		&models.GhostAssociatedMedia{},
		&models.LibraryMedia{},
		&models.LibraryEpisode{},
		&models.LibrarySeason{},
		&models.Token{},
		&models.ProviderMapping{},
		&models.MediaEntryListData{},
		&models.WatchHistory{},
		&models.UserMediaProgress{},

		&models.MediaCollection{},
		&models.MetadataCache{},
		&models.EpisodeSkipTime{},
		&models.MediaIDMapping{},
		&models.ShelvedLocalFiles{},
	); err != nil {
		return err
	}

	// 1. Eliminar duplicados de watch_histories antes de crear el índice único compuesto
	_ = db.Exec(`
		DELETE FROM watch_histories
		WHERE id NOT IN (
			SELECT MAX(id)
			FROM watch_histories
			GROUP BY account_id, media_id, episode_number
		)
	`).Error

	// 2. Asegurar que el índice único compuesto exista para evitar errores de ON CONFLICT
	if err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_media_episode ON watch_histories (account_id, media_id, episode_number)").Error; err != nil {
		println("db: failed to create unique index on watch_histories:", err.Error())
	}

	// Migración manual: actualiza el índice único de LibraryMedia para manejar
	// colisiones entre películas y series.
	if db.Migrator().HasIndex(&models.LibraryMedia{}, "idx_library_media_tmdb_id") {
		_ = db.Migrator().DropIndex(&models.LibraryMedia{}, "idx_library_media_tmdb_id")
		_ = db.AutoMigrate(&models.LibraryMedia{})
	}

	// Purge legacy local_files table if it exists
	if db.Migrator().HasTable("local_files") {
		_ = db.Migrator().DropTable("local_files")
	}

	return nil
}

// migrateLegacyLocalFiles convierte el blob legacy LocalFiles al modelo relacional
// LocalFile. Se ejecuta en segundo plano una vez que el pool WAL está activo.
func migrateLegacyLocalFiles(gormDB *gorm.DB) error {
	if !gormDB.Migrator().HasTable("local_files") {
		return nil
	}
	var count int64
	gormDB.Table("local_files").Count(&count)
	var relationalCount int64
	gormDB.Model(&models.LocalFile{}).Count(&relationalCount)

	if relationalCount == 0 && count > 0 {
		var legacy models.LocalFiles
		if err := gormDB.Table("local_files").Last(&legacy).Error; err == nil {
			var lfs []*dto.LocalFile
			if err := json.Unmarshal(legacy.Value, &lfs); err == nil && len(lfs) > 0 {
				dbFiles := make([]*models.LocalFile, len(lfs))
				for i, f := range lfs {
					dbf := &models.LocalFile{
						Path:           f.Path,
						Name:           f.Name,
						FileHash:       f.FileHash,
						Locked:         f.Locked,
						Ignored:        f.Ignored,
						LibraryMediaId: f.LibraryMediaId,
						MediaID:        f.MediaID,
					}
					if f.ParsedData != nil {
						dbf.ParsedData, _ = json.Marshal(f.ParsedData)
					}
					if f.ParsedFolderData != nil {
						dbf.ParsedFolderData, _ = json.Marshal(f.ParsedFolderData)
					}
					if f.Metadata != nil {
						dbf.Metadata, _ = json.Marshal(f.Metadata)
					}
					if f.TechnicalInfo != nil {
						dbf.TechnicalInfo, _ = json.Marshal(f.TechnicalInfo)
					}
					dbFiles[i] = dbf
				}
				return gormDB.CreateInBatches(dbFiles, 100).Error
			}
		}
	}
	return nil
}

// migrateDefaultSettings aplica valores por defecto a columnas booleanas que se
// almacenaron históricamente como false pero cuyo default correcto es true.
// Solo modifica filas que no han sido configuradas explícitamente por el usuario
// (detectadas porque otros campos de preferencia también están en su valor inicial).
func migrateDefaultSettings(gormDB *gorm.DB, logger *zerolog.Logger) {
	result := gormDB.Exec("UPDATE settings SET library_auto_play_next_episode = 1 WHERE library_auto_play_next_episode = 0")
	if result.Error != nil {
		logger.Error().Err(result.Error).Msg("db: fallo al migrar auto_play_next_episode")
	} else if result.RowsAffected > 0 {
		logger.Info().Int64("rows", result.RowsAffected).Msg("db: auto_play_next_episode habilitado en configuración existente")
	}
}

// RunDatabaseCleanup ejecuta todas las operaciones de limpieza de la base de datos.
func (db *Database) RunDatabaseCleanup() {
	db.cleanupManager.RunAllCleanupOperations()
}

// ResetLocalFilesMediaIds resetea todos los media IDs y library media IDs en la base de datos
// de archivos locales. Fuerza al escáner a re-coincidir todos los archivos en el próximo escaneo.
func (db *Database) ResetLocalFilesMediaIds() error {
	lfs, id, err := GetLocalFiles(db)
	if err != nil {
		db.Logger.Error().Err(err).Msg("db: Failed to get local files for reset")
		return err
	}

	for _, lf := range lfs {
		lf.MediaID = 0
		lf.LibraryMediaId = 0
	}

	_, err = SaveLocalFiles(db, id, lfs)
	if err != nil {
		db.Logger.Error().Err(err).Msg("db: Failed to save reset local files")
		return err
	}

	_ = db.Gorm().Exec("DELETE FROM ghost_associated_media").Error

	db.Logger.Info().Msg("db: All local file media associations and ghost associations have been reset")
	return nil
}
