let map;
let markers = [];
let searchBox;
let placesService;
let banks = [];

// تهيئة الخريطة
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 24.7136, lng: 46.6753 }, // الرياض كمركز افتراضي
        zoom: 12
    });

    // تهيئة خدمة الأماكن
    placesService = new google.maps.places.PlacesService(map);

    // تحميل المصارف من الخادم
    loadBanks();

    // الحصول على موقع المستخدم
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // إضافة علامة لموقع المستخدم
                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                    title: 'موقعك الحالي'
                });

                // تحديث الخريطة لتركز على موقع المستخدم
                map.setCenter(userLocation);

                // ترتيب المصارف حسب المسافة
                sortBanksByDistance(userLocation);
            },
            (error) => {
                console.error('خطأ في الحصول على الموقع:', error);
            }
        );
    }

    // إعداد نموذج البحث
    setupSearchForm();
}

// تحميل المصارف من الخادم
async function loadBanks() {
    try {
        const response = await fetch('/api/banks');
        banks = await response.json();
        banks.forEach(bank => addBankMarker(bank));
        updateBanksList();
    } catch (error) {
        console.error('خطأ في تحميل المصارف:', error);
    }
}

// إضافة علامة مصرف على الخريطة
function addBankMarker(bank) {
    const marker = new google.maps.Marker({
        position: { lat: bank.lat, lng: bank.lng },
        map: map,
        title: bank.name
    });
    markers.push(marker);
    return marker;
}

// إعداد نموذج البحث
function setupSearchForm() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            searchPlaces(query);
        }
    });

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length > 2) {
            searchPlaces(query);
        } else {
            searchResults.style.display = 'none';
        }
    });
}

// البحث عن الأماكن
function searchPlaces(query) {
    const searchResults = document.getElementById('searchResults');
    
    const request = {
        query: query,
        fields: ['name', 'geometry', 'formatted_address']
    };

    placesService.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            displaySearchResults(results);
        }
    });
}

// عرض نتائج البحث
function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';
    searchResults.style.display = 'block';

    results.forEach(place => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.textContent = place.name;
        
        resultItem.addEventListener('click', () => {
            addNewBank(place);
            searchResults.style.display = 'none';
        });

        searchResults.appendChild(resultItem);
    });
}

// إضافة مصرف جديد
async function addNewBank(place) {
    const newBank = {
        name: place.name,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
    };

    try {
        const response = await fetch('/api/banks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newBank)
        });

        const savedBank = await response.json();
        banks.push(savedBank);
        addBankMarker(savedBank);
        updateBanksList();
        
        // تحديث الخريطة لتركز على المصرف الجديد
        map.setCenter(place.geometry.location);
        map.setZoom(15);
    } catch (error) {
        console.error('خطأ في إضافة المصرف:', error);
    }
}

// حساب المسافة بين نقطتين
function calculateDistance(point1, point2) {
    const R = 6371; // نصف قطر الأرض بالكيلومترات
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ترتيب المصارف حسب المسافة
function sortBanksByDistance(userLocation) {
    banks.sort((a, b) => {
        const distanceA = calculateDistance(userLocation, { lat: a.lat, lng: a.lng });
        const distanceB = calculateDistance(userLocation, { lat: b.lat, lng: b.lng });
        return distanceA - distanceB;
    });

    // تحديث قائمة المصارف في الواجهة
    updateBanksList();
}

// تحديث قائمة المصارف في الواجهة
function updateBanksList() {
    const banksList = document.querySelector('.banks-list');
    banksList.innerHTML = '<h2>قائمة المصارف</h2>';

    banks.forEach(bank => {
        const bankItem = document.createElement('div');
        bankItem.className = `bank-item ${bank.completed ? 'completed' : ''}`;
        bankItem.innerHTML = `
            <span>${bank.name}</span>
            <button class="complete-btn" ${bank.completed ? 'disabled' : ''}>
                ${bank.completed ? 'مكتمل' : 'إكمال'}
            </button>
        `;
        banksList.appendChild(bankItem);
    });

    // إضافة مستمعي الأحداث للأزرار
    addButtonListeners();
}

// إضافة مستمعي الأحداث لأزرار الإكمال
function addButtonListeners() {
    document.querySelectorAll('.complete-btn').forEach((button, index) => {
        button.addEventListener('click', async function() {
            const bank = banks[index];
            try {
                const response = await fetch(`/api/banks/${bank.id}/complete`, {
                    method: 'POST'
                });
                const updatedBank = await response.json();
                banks[index] = updatedBank;
                
                const bankItem = this.parentElement;
                bankItem.classList.add('completed');
                this.textContent = 'مكتمل';
                this.disabled = true;
            } catch (error) {
                console.error('خطأ في تحديث حالة المصرف:', error);
            }
        });
    });
}

// تحميل خريطة جوجل
function loadGoogleMapsScript() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

// تحميل الخريطة عند تحميل الصفحة
window.onload = loadGoogleMapsScript; 