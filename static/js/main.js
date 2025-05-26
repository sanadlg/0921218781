let map;
let markers = [];
let banks = [];
let searchTimeout;
let userLocation = null;
let placesService;

// تهيئة الخريطة
function initMap() {
    // إعداد الخريطة
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 32.8872, lng: 13.1913 }, // مركز طرابلس
        zoom: 13
    });

    // إعداد خدمة الأماكن
    placesService = new google.maps.places.PlacesService(map);

    // إضافة المصارف على الخريطة
    banks.forEach(bank => addBankMarker(bank));

    // الحصول على موقع المستخدم
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('تم الحصول على موقع المستخدم:', userLocation);
                
                // إضافة علامة موقع المستخدم
                new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: "#4285F4",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                    },
                    title: "موقعك الحالي"
                });

                // تحديث قائمة المصارف
                updateBanksList();
            },
            (error) => {
                console.error('خطأ في الحصول على الموقع:', error);
                updateBanksList();
            }
        );
    } else {
        console.log('المتصفح لا يدعم تحديد الموقع');
        updateBanksList();
    }

    // إعداد نموذج البحث
    setupSearchForm();
}

// إضافة علامة مصرف على الخريطة
function addBankMarker(bank) {
    const marker = new google.maps.Marker({
        position: { lat: bank.lat, lng: bank.lng },
        map: map,
        title: bank.name,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: bank.selected ? "#2ecc71" : "#e74c3c",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
        }
    });

    // إضافة نافذة معلومات
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="padding: 10px;">
                <h3 style="margin: 0 0 5px 0;">${bank.name}</h3>
                <p style="margin: 0;">${bank.address}</p>
                <button onclick="toggleBankSelection(${bank.id})" style="margin-top: 10px; padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    ${bank.selected ? 'إلغاء الاختيار' : 'اختيار'}
                </button>
            </div>
        `
    });

    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });

    markers.push(marker);
    return marker;
}

// تحديث علامات المصارف على الخريطة
function updateMarkers() {
    // إزالة العلامات القديمة
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    // إضافة علامات جديدة
    banks.forEach(bank => {
        const marker = new google.maps.Marker({
            position: { lat: bank.lat, lng: bank.lng },
            map: map,
            title: bank.name,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: bank.selected ? "#2ecc71" : "#e74c3c",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2,
            }
        });

        // إضافة نافذة معلومات
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 10px;">
                    <h3 style="margin: 0 0 5px 0;">${bank.name}</h3>
                    <p style="margin: 0;">${bank.address}</p>
                    <button onclick="toggleBankSelection(${bank.id})" style="margin-top: 10px; padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        ${bank.selected ? 'إلغاء الاختيار' : 'اختيار'}
                    </button>
                </div>
            `
        });

        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });

        markers.push(marker);
    });
}

// إعداد نموذج البحث
function setupSearchForm() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    // البحث في خرائط جوجل
    const searchBox = new google.maps.places.SearchBox(searchInput);

    // عند تغيير نتائج البحث
    searchBox.addListener('places_changed', function() {
        const places = searchBox.getPlaces();
        if (places.length === 0) return;

        // تحديث الخريطة لتظهر نتائج البحث
        const bounds = new google.maps.LatLngBounds();
        places.forEach(place => {
            if (!place.geometry || !place.geometry.location) return;

            // إضافة علامة للمكان المبحوث عنه
            new google.maps.Marker({
                map: map,
                position: place.geometry.location,
                title: place.name,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                }
            });

            bounds.extend(place.geometry.location);
        });

        // تحديث حدود الخريطة
        map.fitBounds(bounds);

        // البحث عن المصارف القريبة
        const searchLocation = places[0].geometry.location;
        const nearbyBanks = banks.filter(bank => {
            const bankLocation = new google.maps.LatLng(bank.lat, bank.lng);
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
                searchLocation,
                bankLocation
            );
            return distance <= 5000; // البحث في نطاق 5 كيلومترات
        });

        // عرض المصارف القريبة
        displaySearchResults(nearbyBanks);
    });

    // منع إرسال النموذج
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
    });

    // إخفاء النتائج عند النقر خارج منطقة البحث
    document.addEventListener('click', function(e) {
        if (!searchForm.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

// عرض نتائج البحث
function displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';
    searchResults.style.display = 'block';

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">لم يتم العثور على مصارف قريبة</div>';
        return;
    }

    // ترتيب النتائج حسب المسافة
    results.sort((a, b) => {
        const distanceA = calculateDistance(userLocation || { lat: 32.8872, lng: 13.1913 }, { lat: a.lat, lng: a.lng });
        const distanceB = calculateDistance(userLocation || { lat: 32.8872, lng: 13.1913 }, { lat: b.lat, lng: b.lng });
        return distanceA - distanceB;
    });

    results.forEach(bank => {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        let distanceText = '';
        if (userLocation) {
            const distance = calculateDistance(userLocation, { lat: bank.lat, lng: bank.lng });
            distanceText = `<div class="bank-distance">المسافة: ${distance.toFixed(1)} كم</div>`;
        }
        resultItem.innerHTML = `
            <div class="bank-name">${bank.name}</div>
            <div class="bank-address">${bank.address}</div>
            ${distanceText}
            <button class="select-btn" onclick="toggleBankSelection(${bank.id})">
                ${bank.selected ? 'إلغاء الاختيار' : 'اختيار'}
            </button>
        `;
        
        resultItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('select-btn')) {
                // تحريك الخريطة إلى موقع المصرف
                map.setCenter({ lat: bank.lat, lng: bank.lng });
                map.setZoom(15);
                
                // إظهار المصرف في القائمة
                const bankElement = document.querySelector(`.bank-item[data-id="${bank.id}"]`);
                if (bankElement) {
                    bankElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    bankElement.style.backgroundColor = '#f0f0f0';
                    setTimeout(() => {
                        bankElement.style.backgroundColor = '';
                    }, 2000);
                }
                searchResults.style.display = 'none';
            }
        });

        searchResults.appendChild(resultItem);
    });
}

// إضافة مصرف جديد
async function addNewBank(place) {
    const newBank = {
        name: place.name,
        lat: place.lat,
        lng: place.lng
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
        
        // إضافة زر لفتح خرائط جوجل
        const bankItem = document.querySelector(`.bank-item[data-id="${savedBank.id}"]`);
        if (bankItem) {
            const mapsButton = document.createElement('button');
            mapsButton.className = 'maps-btn';
            mapsButton.textContent = 'فتح في خرائط جوجل';
            mapsButton.onclick = () => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${savedBank.lat},${savedBank.lng}`;
                window.open(mapsUrl, '_blank');
            };
            bankItem.appendChild(mapsButton);
        }
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

// تحديث قائمة المصارف
function updateBanksList() {
    const banksList = document.querySelector('.banks-list');
    banksList.innerHTML = '<h2>قائمة المصارف</h2>';

    // ترتيب المصارف حسب المسافة إذا كان موقع المستخدم متاحاً
    let sortedBanks = [...banks];
    if (userLocation) {
        sortedBanks.sort((a, b) => {
            const distanceA = calculateDistance(userLocation, { lat: a.lat, lng: a.lng });
            const distanceB = calculateDistance(userLocation, { lat: b.lat, lng: b.lng });
            return distanceA - distanceB;
        });
    }

    sortedBanks.forEach(bank => {
        const bankItem = document.createElement('div');
        bankItem.className = `bank-item ${bank.completed ? 'completed' : ''} ${bank.selected ? 'selected' : ''}`;
        bankItem.setAttribute('data-id', bank.id);
        
        let distanceText = '';
        if (userLocation) {
            const distance = calculateDistance(userLocation, { lat: bank.lat, lng: bank.lng });
            distanceText = `<div class="bank-distance">المسافة: ${distance.toFixed(1)} كم</div>`;
        }

        bankItem.innerHTML = `
            <div class="bank-info">
                <span class="bank-name">${bank.name}</span>
                <span class="bank-address">${bank.address}</span>
                ${distanceText}
            </div>
            <div class="bank-buttons">
                <button class="select-btn" onclick="toggleBankSelection(${bank.id})">
                    ${bank.selected ? 'إلغاء الاختيار' : 'اختيار'}
                </button>
                <button class="complete-btn" onclick="toggleBankCompletion(${bank.id})" ${bank.completed ? 'disabled' : ''}>
                    ${bank.completed ? 'مكتمل' : 'إكمال'}
                </button>
                <button class="maps-btn" onclick="openGoogleMaps(${bank.lat}, ${bank.lng})">
                    فتح في خرائط جوجل
                </button>
            </div>
        `;
        banksList.appendChild(bankItem);
    });

    // تحديث العلامات على الخريطة
    updateMarkers();
}

// إضافة مستمعي الأحداث لأزرار الإكمال
function addButtonListeners() {
    document.querySelectorAll('.complete-btn').forEach((button, index) => {
        button.addEventListener('click', function() {
            const bank = banks[index];
            bank.completed = true;
            
            const bankItem = this.parentElement.parentElement;
            bankItem.classList.add('completed');
            this.textContent = 'مكتمل';
            this.disabled = true;
        });
    });
}

// تهيئة الخريطة عند تحميل الصفحة
window.onload = initMap;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('تم تحميل التطبيق');
    initApp();
});

// تهيئة التطبيق
function initApp() {
    console.log('بدء تهيئة التطبيق');
    setupAddBankButton();
    setupSelectedBanksButton();
    getUserLocation();
    loadBanks();
}

// إعداد زر إضافة مصرف
function setupAddBankButton() {
    const addBankButton = document.getElementById('addBankButton');
    if (addBankButton) {
        addBankButton.addEventListener('click', showAddBankForm);
    }
}

// إظهار نموذج إضافة مصرف
function showAddBankForm() {
    const form = document.getElementById('addBankForm');
    if (form) {
        form.style.display = 'block';
    }
}

// إخفاء نموذج إضافة مصرف
function hideAddBankForm() {
    const form = document.getElementById('addBankForm');
    if (form) {
        form.style.display = 'none';
        form.reset();
    }
}

// إعداد زر المصارف المختارة
function setupSelectedBanksButton() {
    const selectedBanksButton = document.getElementById('selectedBanksButton');
    if (selectedBanksButton) {
        selectedBanksButton.addEventListener('click', function() {
            window.location.href = '/selected-banks';
        });
    }
}

// الحصول على موقع المستخدم
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log('تم الحصول على موقع المستخدم:', userLocation);
                updateBanksList();
            },
            (error) => {
                console.error('خطأ في الحصول على الموقع:', error);
                updateBanksList();
            }
        );
    } else {
        console.log('المتصفح لا يدعم تحديد الموقع');
        updateBanksList();
    }
}

// تحميل المصارف
function loadBanks() {
    fetch('/api/banks')
        .then(response => response.json())
        .then(data => {
            banks = data;
            updateBanksList();
        })
        .catch(error => {
            console.error('خطأ في تحميل المصارف:', error);
        });
}

// إضافة مصرف جديد
document.getElementById('bankForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('bankName').value;
    const address = document.getElementById('bankAddress').value;
    const locationUrl = document.getElementById('bankLocation').value;
    
    // استخراج الإحداثيات من رابط خرائط جوجل
    const coordinates = extractCoordinatesFromUrl(locationUrl);
    if (!coordinates) {
        alert('الرجاء إدخال رابط صحيح من خرائط جوجل');
        return;
    }
    
    const newBank = {
        name: name,
        address: address,
        lat: coordinates.lat,
        lng: coordinates.lng
    };
    
    fetch('/api/banks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newBank)
    })
    .then(response => response.json())
    .then(data => {
        banks.push(data);
        updateBanksList();
        hideAddBankForm();
    })
    .catch(error => {
        console.error('خطأ في إضافة المصرف:', error);
        alert('حدث خطأ أثناء إضافة المصرف');
    });
});

// استخراج الإحداثيات من رابط خرائط جوجل
function extractCoordinatesFromUrl(url) {
    try {
        // تحليل الرابط للحصول على الإحداثيات
        const urlObj = new URL(url);
        const query = urlObj.searchParams.get('query');
        if (query) {
            const [lat, lng] = query.split(',').map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { lat, lng };
            }
        }
        return null;
    } catch (error) {
        console.error('خطأ في تحليل الرابط:', error);
        return null;
    }
}

// تبديل حالة اختيار المصرف
function toggleBankSelection(bankId) {
    const bank = banks.find(b => b.id === bankId);
    if (bank) {
        bank.selected = !bank.selected;
        
        // تحديث التخزين المحلي
        const selectedBanks = banks.filter(b => b.selected);
        localStorage.setItem('selectedBanks', JSON.stringify(selectedBanks));
        
        // تحديث العلامات على الخريطة
        updateMarkers();
        
        console.log('تم تحديث حالة المصرف:', bank.name, 'مختار:', bank.selected);
    }
}

// تبديل حالة إكمال المصرف
function toggleBankCompletion(bankId) {
    const bank = banks.find(b => b.id === bankId);
    if (bank) {
        bank.completed = !bank.completed;
        
        fetch(`/api/banks/${bankId}/complete`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            updateBanksList();
        })
        .catch(error => {
            console.error('خطأ في تحديث حالة المصرف:', error);
        });
    }
}

// فتح خرائط جوجل
function openGoogleMaps(lat, lng) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
} 