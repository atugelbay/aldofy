package main

import (
	"encoding/json"
	"groupie-tracker/models"
	"groupie-tracker/utils"
	"html/template"
	"log"
	"net/http"
	"strings"
)

var (
	tpl = template.Must(template.New("index.html").Funcs(template.FuncMap{
		"marshal": marshal,
		"join":    strings.Join,
		"safeJS":  safeJS,
		"js":      template.JSEscapeString,
	}).ParseFiles("web/templates/index.html"))
	errtpl = template.Must(template.ParseFiles("web/templates/error.html"))
)

func main() {
	port := os.Getenv("PORT")
	mux := http.NewServeMux()
	fs := http.FileServer(http.Dir("web/statics"))
	js := http.FileServer(http.Dir("web/statics/js"))

	mux.Handle("/statics/", http.StripPrefix("/statics/", fs))
	mux.Handle("/statics/js/", http.StripPrefix("/statics/js/", js))
	mux.Handle("/favicon.ico", http.FileServer(http.Dir(".")))

	mux.HandleFunc("/", rootHandler)

	log.Println("Server started on http://localhost:8080")
	if port == "" {
    		port = "8080"
	}
	http.ListenAndServe(":" + port, ...)
}

func rootHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		renderError(w, http.StatusNotFound, "Not found",
			"Requested page was not found.")
		return
	}

	if r.Method != http.MethodGet {
		renderError(w, http.StatusMethodNotAllowed, "Method Not Allowed",
			"Use GET to access this page.")
		return
	}

	// Загрузи все данные с обработкой ошибок
	artists, err := utils.LoadArtists()
	if err != nil {
		renderError(w, http.StatusInternalServerError, "Internal Server Error", "Failed to load artists data.")
		return
	}
	dates, err := utils.LoadDates()
	if err != nil {
		renderError(w, http.StatusInternalServerError, "Internal Server Error", "Failed to load dates data.")
		return
	}
	relations, err := utils.LoadRelations()
	if err != nil {
		renderError(w, http.StatusInternalServerError, "Internal Server Error", "Failed to load relations data.")
		return
	}
	locations, err := utils.LoadLocation()
	if err != nil {
		renderError(w, http.StatusInternalServerError, "Internal Server Error", "Failed to load locations data.")
		return
	}

	var data []models.ArtistView
	for _, artist := range artists {
		rawLocs := findLocationsByID(artist.ID, locations)
		formattedLocs := make([]string, len(rawLocs))
		for i, loc := range rawLocs {
			formattedLocs[i] = formatLocation(loc)
		}
		data = append(data, models.ArtistView{
			Name:         artist.Name,
			Image:        artist.Image,
			Members:      artist.Members,
			FirstAlbum:   artist.FirstAlbum,
			CreationDate: artist.CreationDate,
			Dates:        findDatesByID(artist.ID, dates),
			Relations:    findRelationsByID(artist.ID, relations),
			Locations:    formattedLocs,
		})
	}

	if err := tpl.Execute(w, data); err != nil {
		renderError(w, http.StatusInternalServerError, "Internal Server Error", "Failed to render page.")
		return
	}
}

func formatLocation(s string) string {
	s = strings.ReplaceAll(s, "_", " ")
	s = strings.ReplaceAll(s, "-", " | ")
	return s
}

// Поиск локаций по ID
func findLocationsByID(id int, locations []models.LocationData) []string {
	for _, l := range locations {
		if l.ID == id {
			return l.Locations
		}
	}
	return []string{}
}

func renderError(w http.ResponseWriter, code int, title, message string) {
	w.WriteHeader(code)
	data := struct {
		Code    int
		Title   string
		Message string
	}{
		Code:    code,
		Title:   title,
		Message: message,
	}
	// Пытаемся отрендерить шаблон ошибки
	if err := errtpl.Execute(w, data); err != nil {
		// Если не получилось — просто пишем текст ошибки, не вызывая WriteHeader снова
		w.Write([]byte(title + ": " + message))
	}
}

func marshal(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func findDatesByID(id int, dates []models.DatesData) []string {
	for _, d := range dates {
		if d.ID == id {
			return d.Dates
		}
	}
	return []string{}
}
func findRelationsByID(id int, relations []models.RelationData) map[string][]string {
	for _, r := range relations {
		if r.ID == id {
			return r.DatesLocations
		}
	}
	return map[string][]string{}
}

func safeJS(s string) template.JS {
	return template.JS(s)
}
