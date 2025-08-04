package utils

import (
	"encoding/json"
	"fmt"
	"groupie-tracker/models"
	"net/http"
)

const baseURL = "https://groupietrackers.herokuapp.com/api"

func LoadArtists() ([]models.Artist, error) {
	resp, err := http.Get(baseURL + "/artists")
	if err != nil {
		return nil, fmt.Errorf("error parsing artists json: %w", err)
	}
	defer resp.Body.Close()

	var artists []models.Artist
	if err := json.NewDecoder(resp.Body).Decode(&artists); err != nil {
		return nil, fmt.Errorf("error of decoding artists: %w", err)
	}
	return artists, nil
}

func LoadLocation() ([]models.LocationData, error) {
	resp, err := http.Get(baseURL + "/locations")
	if err != nil {
		return nil, fmt.Errorf("error parsing location json: %w", err)
	}
	defer resp.Body.Close()

	var wrapper struct {
		Index []models.LocationData `json:"index"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&wrapper); err != nil {
		return nil, fmt.Errorf("error of decoding locations: %w", err)
	}
	return wrapper.Index, nil
}

func LoadDates() ([]models.DatesData, error) {
	resp, err := http.Get(baseURL + "/dates")
	if err != nil {
		return nil, fmt.Errorf("error parsing dates json: %w", err)
	}
	defer resp.Body.Close()

	var wrapper struct {
		Index []models.DatesData `json:"index"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&wrapper); err != nil {
		return nil, fmt.Errorf("error of decoding dates: %w", err)
	}
	return wrapper.Index, nil
}

func LoadRelations() ([]models.RelationData, error) {
	resp, err := http.Get(baseURL + "/relation")
	if err != nil {
		return nil, fmt.Errorf("error parsing relation json: %w", err)
	}
	defer resp.Body.Close()

	var wrapper struct {
		Index []models.RelationData `json:"index"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&wrapper); err != nil {
		return nil, fmt.Errorf("error of decoding relations: %w", err)
	}
	return wrapper.Index, nil
}
