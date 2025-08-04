// --- Фильтрация, поиск и сортировка артистов ---
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  const countryFilter = document.getElementById('country-filter');
  const sortSelect = document.getElementById('sort-select');
  const container = document.getElementById('artists-container');
  if (!container) return;

  // Собираем данные об артистах из DOM
  let artists = Array.from(container.children).map(card => {
    const name = card.querySelector('.album-badge')?.textContent.trim() || '';
    const country = (card.getAttribute('data-country') || '').toUpperCase();
    const cities = (card.getAttribute('data-cities') || '').toUpperCase();
    const dates = (card.getAttribute('data-dates') || '').toUpperCase();
    const year = card.getAttribute('data-year') || '';
    const concerts = parseInt(card.getAttribute('data-concerts') || '0', 10);
    return { card, name, country, cities, dates, year, concerts };
  });

  // Собрать уникальные страны для фильтра
  const countries = Array.from(new Set(artists.map(a => a.country).filter(Boolean))).sort();
  countries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    countryFilter.appendChild(opt);
  });

  function filterAndSort() {
    const q = searchInput.value.trim().toUpperCase();
    const country = countryFilter.value.toUpperCase();
    const sort = sortSelect.value;
    let filtered = artists.filter(a => {
      let match = true;
      if (q) {
        match = a.name.toUpperCase().includes(q);
      }
      if (country && a.country !== country) match = false;
      return match;
    });
    // Сортировка
    if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'date') filtered.sort((a, b) => (a.year || 0) - (b.year || 0));
    else if (sort === 'concerts') filtered.sort((a, b) => (b.concerts - a.concerts));
    // Удалить все карточки
    while (container.firstChild) container.removeChild(container.firstChild);
    // Добавить отсортированные карточки
    filtered.forEach(a => container.appendChild(a.card));
  }

  searchInput.addEventListener('input', filterAndSort);
  countryFilter.addEventListener('change', filterAndSort);
  sortSelect.addEventListener('change', filterAndSort);
  filterAndSort();
});
let audio = null;
let userInteracted = false;
let modalOpen = false;
let playTimeout = null;
let currentCard = null;

document.body.addEventListener('click', () => { userInteracted = true; });

async function preloadTrack(artistName, cardElem) {
  // Если уже есть таймер — не запускаем новый
  if (playTimeout) return;

  currentCard = cardElem;

  playTimeout = setTimeout(async () => {
    try {
      // Поиск только по исполнителю
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&entity=song&attribute=artistTerm&limit=20`
      );
      const data = await response.json();

      // Фильтруем по точному совпадению имени исполнителя
      const filtered = data.results.filter(
        track => track.artistName.toLowerCase() === artistName.toLowerCase()
      );

      if (filtered.length > 0) {
        const random = filtered[Math.floor(Math.random() * filtered.length)];
        const randomTrack = random.previewUrl;

        if (audio) {
          audio.pause();
          audio = null;
        }

        audio = new Audio(randomTrack);
        audio.load();

        // Показываем название трека, альбом, год, длительность
        showTrackName(
          cardElem,
          random.trackName,
          random.collectionName,
          random.releaseDate,
          random.trackTimeMillis
        );

        if (userInteracted) {
          audio.play().catch(e => console.log('Audio playback failed:', e));
        }
      }
    } catch (error) {
      console.error('Error fetching track:', error);
    }
    playTimeout = null;
  }, 2000); // 2 секунды задержки
}

function stopTrack() {
  if (playTimeout) {
    clearTimeout(playTimeout);
    playTimeout = null;
  }
  // Останавливаем трек только если модалка не открыта
  if (!modalOpen && audio) {
    audio.pause();
    audio = null;
  }
  if (currentCard) {
    hideTrackName(currentCard);
    currentCard = null;
  }
}

function showTrackName(cardElem, trackName, album, releaseDate, trackTimeMillis) {
  let label = cardElem.querySelector('.track-label');
  if (!label) {
    label = document.createElement('div');
    label.className = 'track-label';
    cardElem.appendChild(label);
  }
  // Форматируем длительность
  let duration = '';
  if (trackTimeMillis) {
    const min = Math.floor(trackTimeMillis / 60000);
    const sec = Math.floor((trackTimeMillis % 60000) / 1000).toString().padStart(2, '0');
    duration = `${min}:${sec}`;
  }
  // Форматируем год
  let year = '';
  if (releaseDate) {
    year = new Date(releaseDate).getFullYear();
  }
  label.innerHTML = `
    <div><b>${trackName || ''}</b></div>
    <div style="font-size:0.95em;">${album || ''}</div>
    <div style="font-size:0.85em; color:#bbb;">
      ${year ? 'Year: ' + year : ''}${duration ? ' · ' + duration : ''}
    </div>
  `;
  label.style.display = 'block';
}

function hideTrackName(cardElem) {
  const label = cardElem.querySelector('.track-label');
  if (label) {
    label.style.display = 'none';
  }
}

function openModal(name, image, members, album, date, dates, relations, locations) {
  document.getElementById('modal-image').src = image;
  document.getElementById('modal-name').textContent = name;
  document.getElementById('modal-members').textContent = Array.isArray(members) ? members.join(', ') : members;
  document.getElementById('modal-album').textContent = album;
  document.getElementById('modal-date').textContent = date;

  // Dates
  const datesElem = document.getElementById('modal-dates');
  datesElem.innerHTML = '';
  if (Array.isArray(dates) && dates.length > 0) {
    dates.forEach(d => {
      const li = document.createElement('li');
      li.innerHTML = `<span class='badge'>${d.replace(/^\*/, '')}</span>`;
      datesElem.appendChild(li);
    });
  } else {
    datesElem.innerHTML = '<li><span style="color:#888">No dates</span></li>';
  }

  // Events (relations)
  const eventsElem = document.getElementById('modal-events');
  if (eventsElem) {
    eventsElem.innerHTML = '';
    if (relations && typeof relations === 'object' && Object.keys(relations).length > 0) {
      Object.entries(relations).forEach(([city, arr]) => {
        if (!arr || arr.length === 0) return;
        let formatted = city.replace(/[-_]/g, ' ').toUpperCase();
        let parts = formatted.trim().split(' ');
        if (parts.length > 1) {
          const country = parts.pop();
          formatted = parts.join(' ') + ' | ' + country;
        }
        const li = document.createElement('li');
        const locSpan = document.createElement('span');
        locSpan.className = 'event-location';
        locSpan.textContent = formatted;
        li.appendChild(locSpan);
        const datesUl = document.createElement('ul');
        datesUl.className = 'event-dates';
        arr.forEach(date => {
          const dateLi = document.createElement('li');
          dateLi.innerHTML = `<span class='badge'>${date.replace(/^\*/, '')}</span>`;
          datesUl.appendChild(dateLi);
        });
        li.appendChild(datesUl);
        eventsElem.appendChild(li);
      });
    } else {
      eventsElem.innerHTML = '<li><span style="color:#888">No events</span></li>';
    }
  }

  // Locations (формат: "NORTH CAROLINA | USA")
  const locElem = document.getElementById('modal-locations');
  locElem.innerHTML = '';
  if (Array.isArray(locations) && locations.length > 0) {
    locations.forEach(loc => {
      let formatted = loc.replace(/[_-]/g, ' ').toUpperCase();
      let parts = formatted.trim().split(' ');
      if (parts.length > 1) {
        const country = parts.pop();
        formatted = parts.join(' ') + ' ' + country;
      }
      const li = document.createElement('li');
      li.innerHTML = `<span class='badge'>${formatted}</span>`;
      locElem.appendChild(li);
    });
  } else {
    locElem.innerHTML = '<li><span style="color:#888">No locations</span></li>';
  }

  modalOpen = true;
  document.getElementById('modal').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal(event) {
  modalOpen = false; // Модалка закрыта
  const modal = document.getElementById('modal');
  modal.classList.remove('show');
  // Остановить трек при закрытии модалки
  if (audio) {
    audio.pause();
    audio = null;
  }
  stopTrack();
  document.body.style.overflow = '';
}