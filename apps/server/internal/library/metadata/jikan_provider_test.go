package metadata

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestJikanProvider_Basics(t *testing.T) {
	prov := NewJikanProvider(nil, nil)
	assert.NotNil(t, prov)
	assert.Equal(t, "jikan", prov.GetProviderID())
	assert.Equal(t, "Jikan (MyAnimeList)", prov.GetName())
}
