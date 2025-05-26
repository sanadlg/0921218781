let map;
let markers = [];
let selectedBanks = [];
let userLocation = null;

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    console.log('تم تحميل صفحة المصارف المختارة');
    getUserLocation();
    initMap();
});

// تهيئة الخريطة
function initMap() {
    // إعداد الخريطة
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 32.8872, lng: 13.1913 }, // مركز طرابلس
        zoom: 13
    });

    // تحميل المصارف المختارة من التخزين المحلي
    loadSelectedBanks();
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
                displaySelectedBanks();
            },
            (error) => {
                console.error('خطأ في الحصول على الموقع:', error);
                displaySelectedBanks();
            }
        );
    } else {
        console.log('المتصفح لا يدعم تحديد الموقع');
        displaySelectedBanks();
    }
}

// تحميل المصارف المختارة
function loadSelectedBanks() {
    const savedBanks = localStorage.getItem('selectedBanks');
    if (savedBanks) {
        selectedBanks = JSON.parse(savedBanks);
        console.log('تم تحميل المصارف المختارة:', selectedBanks);
        displaySelectedBanks();
    } else {
        console.log('لا توجد مصارف مختارة');
        const banksList = document.getElementById('selectedBanksList');
        banksList.innerHTML = '<div class="no-banks">لا توجد مصارف مختارة</div>';
    }
}

// عرض المصارف المختارة
function displaySelectedBanks() {
    const banksList = document.getElementById('selectedBanksList');
    banksList.innerHTML = '';

    if (selectedBanks.length === 0) {
        banksList.innerHTML = '<div class="no-banks">لا توجد مصارف مختارة</div>';
        return;
    }

    // ترتيب المصارف حسب المسافة إذا كان موقع المستخدم متاحاً
    let sortedBanks = [...selectedBanks];
    if (userLocation) {
        sortedBanks.sort((a, b) => {
            const distanceA = calculateDistance(userLocation, { lat: a.lat, lng: a.lng });
            const distanceB = calculateDistance(userLocation, { lat: b.lat, lng: b.lng });
            return distanceA - distanceB;
        });
    }

    sortedBanks.forEach(bank => {
        const bankItem = document.createElement('div');
        bankItem.className = 'bank-item';
        
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
                <button class="complete-btn" onclick="toggleBankCompletion(${bank.id})" ${bank.completed ? 'disabled' : ''}>
                    ${bank.completed ? 'مكتمل' : 'إكمال'}
                </button>
                <button class="maps-btn" onclick="openGoogleMaps(${bank.lat}, ${bank.lng})">
                    فتح في خرائط جوجل
                </button>
                <button class="remove-btn" onclick="removeBank(${bank.id})">
                    إزالة
                </button>
            </div>
        `;
        banksList.appendChild(bankItem);
    });
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

// تبديل حالة إكمال المصرف
function toggleBankCompletion(bankId) {
    const bank = selectedBanks.find(b => b.id === bankId);
    if (bank) {
        bank.completed = !bank.completed;
        
        fetch(`/api/banks/${bankId}/complete`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            // تحديث التخزين المحلي
            localStorage.setItem('selectedBanks', JSON.stringify(selectedBanks));
            displaySelectedBanks();
        })
        .catch(error => {
            console.error('خطأ في تحديث حالة المصرف:', error);
        });
    }
}

// إزالة مصرف من القائمة
function removeBank(bankId) {
    selectedBanks = selectedBanks.filter(bank => bank.id !== bankId);
    // تحديث التخزين المحلي
    localStorage.setItem('selectedBanks', JSON.stringify(selectedBanks));
    displaySelectedBanks();
}

// فتح خرائط جوجل
function openGoogleMaps(lat, lng) {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(mapsUrl, '_blank');
} 