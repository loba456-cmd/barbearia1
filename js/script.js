/**
 * BARBER SHOP SCHEDULER SYSTEM - FIREBASE REAL-TIME CLOUD CONNECTED
 */

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCRlF91aFvw7B-rXI0HF3-TB2bWtiNzLz0",
  authDomain: "barbearia-prototipo-3b00f.firebaseapp.com",
  projectId: "barbearia-prototipo-3b00f",
  storageBucket: "barbearia-prototipo-3b00f.firebasestorage.app",
  messagingSenderId: "710529029431",
  appId: "1:710529029431:web:7cd1a67959fecdfea9f6b2",
  measurementId: "G-QD89MCE8JL"
};

// Global App State
const AppState = {
  activeTab: 'customer',
  isAdminAuthenticated: false,
  selectedService: null,
  selectedDate: getFormattedDate(new Date()),
  selectedSlotId: null,
  
  services: [
    { id: 's1', name: 'Corte Cabelo Social / Fade', price: 40, duration: '30 min', icon: 'fa-scissors' },
    { id: 's2', name: 'Barba Completa com Toalha Quente', price: 30, duration: '25 min', icon: 'fa-user-ninja' },
    { id: 's3', name: 'Combo Império (Cabelo + Barba)', price: 65, duration: '50 min', icon: 'fa-crown' },
    { id: 's4', name: 'Pezinho / Acabamento + Sobrancelha', price: 25, duration: '20 min', icon: 'fa-wand-magic-sparkles' }
  ],
  slots: [],
  bookings: []
};

let db = null;
let isCloudActive = false;

// Initialize Firebase Connection
function initFirebase() {
  if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      isCloudActive = true;
      
      const badge = document.getElementById('dbStatusBadge');
      if (badge) {
        badge.className = "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold uppercase border border-green-500/30";
        badge.innerHTML = `<i class="fa-solid fa-cloud"></i> Nuvem Firebase Conectada`;
      }
      
      listenCloudRealtime();
    } catch (e) {
      console.warn("Erro ao conectar ao Firebase Cloud, executando em modo local.", e);
    }
  }
}

// Real-time listener across devices
function listenCloudRealtime() {
  if (!isCloudActive) return;

  // 1. Listen Services Changes
  db.collection('services').onSnapshot(snapshot => {
    if (!snapshot.empty) {
      AppState.services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      CustomerModule.renderServices();
      AdminModule.renderAdminServices();
    } else {
      // Seed default services if database is completely empty
      AppState.services.forEach(svc => {
        db.collection('services').doc(svc.id).set(svc);
      });
    }
  }, err => console.error("Erro listener serviços:", err));

  // 2. Listen Slots Changes
  db.collection('slots').onSnapshot(snapshot => {
    AppState.slots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    CustomerModule.renderSlots();
    AdminModule.renderAdminSlots();
    AdminModule.renderDashboardStats();
  }, err => console.error("Erro listener horários:", err));

  // 3. Listen Bookings Changes (Sync PC <-> Cellphone)
  db.collection('bookings').onSnapshot(snapshot => {
    AppState.bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    CustomerModule.renderSlots();
    AdminModule.renderAdminBookings();
    AdminModule.renderDashboardStats();
  }, err => console.error("Erro listener agendamentos:", err));
}

// Date Utility Functions
function getFormattedDate(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateToBR(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Data Access Layer
const BarberStorage = {
  KEYS: {
    SERVICES: 'barber_services_v5',
    SLOTS: 'barber_slots_v5',
    BOOKINGS: 'barber_bookings_v5'
  },

  initDefaultData() {
    if (!isCloudActive) {
      if (!localStorage.getItem(this.KEYS.SERVICES)) {
        localStorage.setItem(this.KEYS.SERVICES, JSON.stringify(AppState.services));
      } else {
        AppState.services = JSON.parse(localStorage.getItem(this.KEYS.SERVICES));
      }

      if (!localStorage.getItem(this.KEYS.SLOTS)) {
        const today = getFormattedDate(new Date());
        const tomorrowObj = new Date();
        tomorrowObj.setDate(tomorrowObj.getDate() + 1);
        const tomorrow = getFormattedDate(tomorrowObj);

        const defaultTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
        const initialSlots = [];

        [today, tomorrow].forEach(date => {
          defaultTimes.forEach((time, index) => {
            initialSlots.push({
              id: `slot_${date}_${time.replace(':', '')}`,
              date: date,
              time: time,
              capacity: (index === 2) ? 2 : 1,
              active: true
            });
          });
        });

        localStorage.setItem(this.KEYS.SLOTS, JSON.stringify(initialSlots));
        AppState.slots = initialSlots;
      } else {
        AppState.slots = JSON.parse(localStorage.getItem(this.KEYS.SLOTS));
      }

      if (!localStorage.getItem(this.KEYS.BOOKINGS)) {
        AppState.bookings = [];
      } else {
        AppState.bookings = JSON.parse(localStorage.getItem(this.KEYS.BOOKINGS));
      }
    }
  },

  getServices() {
    return AppState.services;
  },

  addService(serviceObj) {
    if (isCloudActive) {
      db.collection('services').doc(serviceObj.id).set(serviceObj);
    } else {
      AppState.services.push(serviceObj);
      localStorage.setItem(this.KEYS.SERVICES, JSON.stringify(AppState.services));
    }
  },

  deleteService(serviceId) {
    if (isCloudActive) {
      db.collection('services').doc(serviceId).delete();
    } else {
      AppState.services = AppState.services.filter(s => s.id !== serviceId);
      localStorage.setItem(this.KEYS.SERVICES, JSON.stringify(AppState.services));
    }
  },

  getSlots(date) {
    if (!date) return AppState.slots;
    return AppState.slots.filter(s => s.date === date);
  },

  addSlot(date, time, capacity = 1) {
    const id = `slot_${date}_${time.replace(':', '')}`;
    const slotData = { id, date, time, capacity: parseInt(capacity), active: true };

    if (isCloudActive) {
      db.collection('slots').doc(id).set(slotData, { merge: true });
    } else {
      const existingIdx = AppState.slots.findIndex(s => s.id === id);
      if (existingIdx >= 0) {
        AppState.slots[existingIdx].capacity = parseInt(capacity);
        AppState.slots[existingIdx].active = true;
      } else {
        AppState.slots.push(slotData);
      }
      localStorage.setItem(this.KEYS.SLOTS, JSON.stringify(AppState.slots));
    }
  },

  updateSlot(slotId, newCapacity, isActive) {
    if (isCloudActive) {
      const updateObj = {};
      if (newCapacity !== undefined) updateObj.capacity = parseInt(newCapacity);
      if (isActive !== undefined) updateObj.active = isActive;
      db.collection('slots').doc(slotId).update(updateObj);
    } else {
      const slot = AppState.slots.find(s => s.id === slotId);
      if (slot) {
        if (newCapacity !== undefined) slot.capacity = parseInt(newCapacity);
        if (isActive !== undefined) slot.active = isActive;
        localStorage.setItem(this.KEYS.SLOTS, JSON.stringify(AppState.slots));
      }
    }
  },

  deleteSlot(slotId) {
    if (isCloudActive) {
      db.collection('slots').doc(slotId).delete();
    } else {
      AppState.slots = AppState.slots.filter(s => s.id !== slotId);
      localStorage.setItem(this.KEYS.SLOTS, JSON.stringify(AppState.slots));
    }
  },

  getBookings(date) {
    if (!date) return AppState.bookings;
    return AppState.bookings.filter(b => b.date === date);
  },

  addBooking(bookingObj) {
    if (isCloudActive) {
      db.collection('bookings').doc(bookingObj.id).set(bookingObj);
    } else {
      AppState.bookings.push(bookingObj);
      localStorage.setItem(this.KEYS.BOOKINGS, JSON.stringify(AppState.bookings));
    }
  },

  cancelBooking(bookingId) {
    if (isCloudActive) {
      db.collection('bookings').doc(bookingId).delete();
    } else {
      AppState.bookings = AppState.bookings.filter(b => b.id !== bookingId);
      localStorage.setItem(this.KEYS.BOOKINGS, JSON.stringify(AppState.bookings));
    }
  },

  getSlotBookingsCount(slotId) {
    return AppState.bookings.filter(b => b.slotId === slotId).length;
  }
};

// UI Rendering & Notifications Module
const BarberUI = {
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    
    const bgColors = {
      success: 'bg-green-600 text-white',
      error: 'bg-red-600 text-white',
      info: 'bg-gold text-dark-900 font-semibold'
    };

    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-exclamation',
      info: 'fa-circle-info'
    };

    toast.className = `toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl ${bgColors[type] || bgColors.info} text-xs sm:text-sm`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]} text-base"></i> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('customConfirmModal');
    document.getElementById('confirmModalTitle').innerText = title;
    document.getElementById('confirmModalMessage').innerText = message;

    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    const cleanUp = () => {
      modal.classList.add('hidden');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => {
      cleanUp();
      onConfirm();
    };

    cancelBtn.onclick = () => {
      cleanUp();
    };

    modal.classList.remove('hidden');
  }
};

// Customer Agendamento Module
const CustomerModule = {
  init() {
    this.renderServices();
    this.setDate('today');
  },

  renderServices() {
    const container = document.getElementById('servicesList');
    const services = BarberStorage.getServices();

    if (services.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-4 text-xs">Nenhum serviço cadastrado.</div>`;
      return;
    }

    container.innerHTML = services.map(svc => `
      <div id="service_card_${svc.id}" onclick="CustomerModule.selectService('${svc.id}')" 
           class="service-card cursor-pointer bg-dark-700/60 border border-gray-700/80 rounded-xl p-4 flex items-center justify-between gap-3 hover:border-gold/50 transition">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gold/10 text-gold flex items-center justify-center text-lg shrink-0">
            <i class="fa-solid ${svc.icon || 'fa-scissors'}"></i>
          </div>
          <div>
            <h3 class="font-bold text-sm text-white leading-tight">${svc.name}</h3>
            <span class="text-xs text-gray-400"><i class="fa-regular fa-clock text-[10px]"></i> ${svc.duration}</span>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="font-bold text-gold text-sm">R$ ${parseFloat(svc.price).toFixed(2).replace('.', ',')}</span>
        </div>
      </div>
    `).join('');

    if (!AppState.selectedService || !services.find(s => s.id === AppState.selectedService.id)) {
      this.selectService(services[0].id);
    } else {
      this.selectService(AppState.selectedService.id);
    }
  },

  selectService(serviceId) {
    const services = BarberStorage.getServices();
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;

    AppState.selectedService = svc;

    document.querySelectorAll('.service-card').forEach(el => el.classList.remove('selected'));
    const selectedCard = document.getElementById(`service_card_${serviceId}`);
    if (selectedCard) selectedCard.classList.add('selected');

    this.updateSummary();
  },

  setDate(type) {
    let dateObj = new Date();
    if (type === 'tomorrow') {
      dateObj.setDate(dateObj.getDate() + 1);
    }

    const dateStr = getFormattedDate(dateObj);
    AppState.selectedDate = dateStr;
    AppState.selectedSlotId = null;

    const btnToday = document.getElementById('btnToday');
    const btnTomorrow = document.getElementById('btnTomorrow');
    const customInput = document.getElementById('customDateInput');

    btnToday.className = "date-btn px-4 py-2.5 rounded-lg border text-sm font-medium transition-all bg-dark-700 border-gray-700 text-gray-300 hover:border-gray-500";
    btnTomorrow.className = "date-btn px-4 py-2.5 rounded-lg border text-sm font-medium transition-all bg-dark-700 border-gray-700 text-gray-300 hover:border-gray-500";
    customInput.value = dateStr;

    if (type === 'today') {
      btnToday.className = "date-btn px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all bg-gold border-gold text-dark-900 shadow-md";
    } else if (type === 'tomorrow') {
      btnTomorrow.className = "date-btn px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all bg-gold border-gold text-dark-900 shadow-md";
    }

    document.getElementById('selectedDateLabel').innerText = formatDateToBR(dateStr);
    this.renderSlots();
    this.updateSummary();
  },

  setCustomDate(dateStr) {
    if (!dateStr) return;
    AppState.selectedDate = dateStr;
    AppState.selectedSlotId = null;

    document.getElementById('btnToday').className = "date-btn px-4 py-2.5 rounded-lg border text-sm font-medium transition-all bg-dark-700 border-gray-700 text-gray-300 hover:border-gray-500";
    document.getElementById('btnTomorrow').className = "date-btn px-4 py-2.5 rounded-lg border text-sm font-medium transition-all bg-dark-700 border-gray-700 text-gray-300 hover:border-gray-500";
    
    document.getElementById('selectedDateLabel').innerText = formatDateToBR(dateStr);
    this.renderSlots();
    this.updateSummary();
  },

  renderSlots() {
    const container = document.getElementById('slotsGrid');
    const slots = BarberStorage.getSlots(AppState.selectedDate).filter(s => s.active !== false);

    if (slots.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-8 text-center bg-dark-900/40 rounded-xl border border-dashed border-gray-700 text-gray-400">
          <i class="fa-regular fa-calendar-xmark text-2xl text-gold mb-2 block"></i>
          Nenhum horário disponível para esta data.
        </div>
      `;
      return;
    }

    slots.sort((a, b) => a.time.localeCompare(b.time));

    container.innerHTML = slots.map(slot => {
      const bookedCount = BarberStorage.getSlotBookingsCount(slot.id);
      const remainingSlots = slot.capacity - bookedCount;
      const isFull = remainingSlots <= 0;
      const isSelected = AppState.selectedSlotId === slot.id;

      let statusBadge = '';
      if (isFull) {
        statusBadge = `<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase">Esgotado</span>`;
      } else if (remainingSlots === 1) {
        statusBadge = `<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">Última vaga</span>`;
      } else {
        statusBadge = `<span class="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold uppercase">${remainingSlots} vagas</span>`;
      }

      return `
        <button type="button" 
                ${isFull ? 'disabled' : ''} 
                onclick="CustomerModule.selectSlot('${slot.id}')"
                class="slot-btn p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                  isFull 
                    ? 'opacity-40 bg-dark-900 border-gray-800 cursor-not-allowed' 
                    : isSelected 
                      ? 'selected shadow-lg shadow-gold/20' 
                      : 'bg-dark-700 border-gray-700 text-gray-200 hover:border-gold/60'
                }">
          <span class="font-bold text-base tracking-wide">${slot.time}</span>
          ${statusBadge}
        </button>
      `;
    }).join('');
  },

  selectSlot(slotId) {
    AppState.selectedSlotId = slotId;
    this.renderSlots();
    this.updateSummary();
  },

  updateSummary() {
    const summaryService = document.getElementById('summaryService');
    const summaryDate = document.getElementById('summaryDate');
    const summaryTime = document.getElementById('summaryTime');
    const summaryPrice = document.getElementById('summaryPrice');

    if (AppState.selectedService) {
      summaryService.innerText = AppState.selectedService.name;
      summaryPrice.innerText = `R$ ${parseFloat(AppState.selectedService.price).toFixed(2).replace('.', ',')}`;
    } else {
      summaryService.innerText = 'Selecione...';
      summaryPrice.innerText = 'R$ 0,00';
    }

    summaryDate.innerText = formatDateToBR(AppState.selectedDate);

    if (AppState.selectedSlotId) {
      const slots = BarberStorage.getSlots(AppState.selectedDate);
      const slot = slots.find(s => s.id === AppState.selectedSlotId);
      summaryTime.innerText = slot ? slot.time : '-';
    } else {
      summaryTime.innerText = 'Selecione o horário';
    }
  },

  handleBookingSubmit(event) {
    event.preventDefault();

    if (!AppState.selectedService) {
      BarberUI.showToast('Por favor, selecione um serviço!', 'error');
      return;
    }

    if (!AppState.selectedSlotId) {
      BarberUI.showToast('Por favor, escolha um horário disponível!', 'error');
      return;
    }

    const nameInput = document.getElementById('custName').value.trim();
    const phoneInput = document.getElementById('custPhone').value.trim();
    const notesInput = document.getElementById('custNotes').value.trim();

    if (!nameInput || !phoneInput) {
      BarberUI.showToast('Preencha seu nome e WhatsApp.', 'error');
      return;
    }

    const slots = BarberStorage.getSlots(AppState.selectedDate);
    const slot = slots.find(s => s.id === AppState.selectedSlotId);

    if (!slot || !slot.active) {
      BarberUI.showToast('Horário indisponível ou desativado.', 'error');
      return;
    }

    const currentBooked = BarberStorage.getSlotBookingsCount(slot.id);
    if (currentBooked >= slot.capacity) {
      BarberUI.showToast('Ops! Este horário acabou de lotar. Escolha outro.', 'error');
      this.renderSlots();
      return;
    }

    const booking = {
      id: 'bk_' + Date.now(),
      slotId: slot.id,
      customerName: nameInput,
      customerPhone: phoneInput,
      customerNotes: notesInput || 'Nenhuma observação',
      serviceName: AppState.selectedService.name,
      servicePrice: parseFloat(AppState.selectedService.price),
      date: AppState.selectedDate,
      time: slot.time,
      createdAt: new Date().toISOString()
    };

    BarberStorage.addBooking(booking);
    
    document.getElementById('bookingForm').reset();
    AppState.selectedSlotId = null;
    this.updateSummary();

    this.showSuccessModal(booking);
  },

  showSuccessModal(booking) {
    const modal = document.getElementById('successModal');
    const receipt = document.getElementById('receiptContent');
    const whatsappBtn = document.getElementById('whatsappBtn');

    receipt.innerHTML = `
      <div class="flex justify-between border-b border-gray-800 pb-2">
        <span class="text-gray-400">Cliente:</span>
        <span class="font-semibold text-white">${booking.customerName}</span>
      </div>
      <div class="flex justify-between border-b border-gray-800 pb-2">
        <span class="text-gray-400">Serviço:</span>
        <span class="font-semibold text-white">${booking.serviceName}</span>
      </div>
      <div class="flex justify-between border-b border-gray-800 pb-2">
        <span class="text-gray-400">Data e Horário:</span>
        <span class="font-semibold text-gold">${formatDateToBR(booking.date)} às ${booking.time}</span>
      </div>
      <div class="flex justify-between border-b border-gray-800 pb-2">
        <span class="text-gray-400">Observações:</span>
        <span class="font-medium text-gray-300 italic">${booking.customerNotes}</span>
      </div>
      <div class="flex justify-between pt-1">
        <span class="text-gray-400">Valor Total:</span>
        <span class="font-bold text-gold">R$ ${parseFloat(booking.servicePrice).toFixed(2).replace('.', ',')}</span>
      </div>
    `;

    const msg = `Olá! Meu nome é *${booking.customerName}* e acabei de agendar o serviço *${booking.serviceName}* para o dia *${formatDateToBR(booking.date)}* às *${booking.time}* na Barbearia Império.\nObservações: ${booking.customerNotes}`;
    whatsappBtn.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;

    modal.classList.remove('hidden');
    BarberUI.showToast('Agendamento confirmado com sucesso!', 'success');
  },

  closeSuccessModal() {
    document.getElementById('successModal').classList.add('hidden');
  }
};

// Admin Panel Module
const AdminModule = {
  currentDate: getFormattedDate(new Date()),

  init() {
    document.getElementById('adminDateInput').value = this.currentDate;
    this.renderDashboardStats();
    this.renderAdminSlots();
    this.renderAdminBookings();
    this.renderAdminServices();
  },

  promptPinModal() {
    document.getElementById('adminPinInput').value = '';
    document.getElementById('pinError').classList.add('hidden');
    document.getElementById('pinModal').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('adminPinInput').focus();
    }, 100);
  },

  closePinModal() {
    document.getElementById('pinModal').classList.add('hidden');
  },

  fillDemoPin() {
    document.getElementById('adminPinInput').value = '1234';
  },

  submitPin(event) {
    event.preventDefault();
    const pin = document.getElementById('adminPinInput').value.trim();

    if (pin === '1234') {
      AppState.isAdminAuthenticated = true;
      this.closePinModal();
      this.showAdminPanelUI();
      BarberUI.showToast('Acesso administrativo liberado.', 'success');
    } else {
      document.getElementById('pinError').classList.remove('hidden');
    }
  },

  showAdminPanelUI() {
    document.getElementById('customerView').classList.add('hidden');
    document.getElementById('adminView').classList.remove('hidden');

    document.getElementById('navCustomerBtn').className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-gray-400 hover:text-white hover:bg-dark-700 flex items-center gap-2";
    document.getElementById('navAdminBtn').className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gold text-dark-900 shadow-md shadow-gold/20 flex items-center gap-2";

    this.init();
  },

  logout() {
    AppState.isAdminAuthenticated = false;
    AppController.switchTab('customer');
    BarberUI.showToast('Sessão administrativa encerrada.', 'info');
  },

  onDateChange(dateStr) {
    if (!dateStr) return;
    this.currentDate = dateStr;
    this.renderDashboardStats();
    this.renderAdminSlots();
    this.renderAdminBookings();
  },

  renderDashboardStats() {
    const bookings = BarberStorage.getBookings(this.currentDate);
    const slots = BarberStorage.getSlots(this.currentDate).filter(s => s.active !== false);

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((acc, b) => acc + (parseFloat(b.servicePrice) || 0), 0);
    
    let totalCapacity = slots.reduce((acc, s) => acc + (parseInt(s.capacity) || 1), 0);
    let occupancyRate = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0;
    if (occupancyRate > 100) occupancyRate = 100;

    document.getElementById('statTotalBookings').innerText = totalBookings;
    document.getElementById('statRevenue').innerText = `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`;
    document.getElementById('statOccupancy').innerText = `${occupancyRate}%`;
  },

  renderAdminSlots() {
    const container = document.getElementById('adminSlotsContainer');
    const slots = BarberStorage.getSlots(this.currentDate);

    document.getElementById('adminSlotCount').innerText = `${slots.length} horário(s) configurado(s)`;

    if (slots.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-6 text-center text-gray-500 text-xs">
          Nenhum horário configurado para esta data. Use o gerador em lote ao lado para criar a grade.
        </div>
      `;
      return;
    }

    slots.sort((a, b) => a.time.localeCompare(b.time));

    container.innerHTML = slots.map(slot => {
      const bookedCount = BarberStorage.getSlotBookingsCount(slot.id);
      const isActive = slot.active !== false;

      return `
        <div class="bg-dark-700 border ${isActive ? 'border-gray-700' : 'border-red-900/40 opacity-60'} rounded-xl p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-white text-base">${slot.time}</span>
            <div class="flex items-center gap-1.5">
              <button onclick="AdminModule.toggleSlotActive('${slot.id}', ${!isActive})" 
                      class="px-2 py-1 rounded text-[10px] font-bold uppercase transition ${isActive ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}">
                ${isActive ? 'Ativo' : 'Inativo'}
              </button>
              
              <button onclick="AdminModule.confirmDeleteSlot('${slot.id}', '${slot.time}')" 
                      class="p-1 text-gray-400 hover:text-red-400 transition" title="Excluir Horário">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs pt-1 border-t border-gray-600/40">
            <span class="text-gray-400">Agendados: <strong class="text-white">${bookedCount}</strong></span>
            <div class="flex items-center gap-1">
              <span class="text-gray-400">Vagas Totais:</span>
              <input type="number" min="1" max="10" value="${slot.capacity}" 
                     onchange="AdminModule.updateSlotCapacity('${slot.id}', this.value)"
                     class="w-12 bg-dark-900 border border-gray-600 rounded text-center text-xs text-gold font-bold py-0.5 focus:border-gold outline-none">
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  toggleSlotActive(slotId, newStatus) {
    BarberStorage.updateSlot(slotId, undefined, newStatus);
    BarberUI.showToast(`Status do horário atualizado.`, 'info');
  },

  updateSlotCapacity(slotId, newCapacity) {
    const val = parseInt(newCapacity);
    if (isNaN(val) || val < 1) return;

    BarberStorage.updateSlot(slotId, val, undefined);
    BarberUI.showToast(`Quantidade de vagas alterada para ${val}.`, 'success');
  },

  handleAddSlot(event) {
    event.preventDefault();
    const time = document.getElementById('newSlotTime').value;
    const capacity = document.getElementById('newSlotCapacity').value;

    if (!time) {
      BarberUI.showToast('Informe o horário.', 'error');
      return;
    }

    BarberStorage.addSlot(this.currentDate, time, capacity);
    BarberUI.showToast(`Horário ${time} adicionado!`, 'success');
  },

  handleBatchGenerate(event) {
    event.preventDefault();
    const startTime = document.getElementById('batchStartTime').value;
    const endTime = document.getElementById('batchEndTime').value;
    const intervalMinutes = parseInt(document.getElementById('batchInterval').value);
    const capacity = parseInt(document.getElementById('batchCapacity').value);

    if (!startTime || !endTime || isNaN(intervalMinutes) || isNaN(capacity)) {
      BarberUI.showToast('Preencha os campos do gerador em lote corretamente.', 'error');
      return;
    }

    let [startH, startM] = startTime.split(':').map(Number);
    let [endH, endM] = endTime.split(':').map(Number);

    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    if (startTotal >= endTotal) {
      BarberUI.showToast('O horário de início deve ser menor que o horário final.', 'error');
      return;
    }

    let count = 0;
    for (let current = startTotal; current <= endTotal; current += intervalMinutes) {
      let hh = String(Math.floor(current / 60)).padStart(2, '0');
      let mm = String(current % 60).padStart(2, '0');
      let timeStr = `${hh}:${mm}`;

      BarberStorage.addSlot(this.currentDate, timeStr, capacity);
      count++;
    }

    BarberUI.showToast(`Gerados ${count} horários com ${capacity} vaga(s) cada!`, 'success');
  },

  confirmDeleteSlot(slotId, time) {
    const bookedCount = BarberStorage.getSlotBookingsCount(slotId);
    let message = `Deseja remover o horário das ${time}?`;
    if (bookedCount > 0) {
      message = `Atenção: Este horário possui ${bookedCount} agendamento(s)! Deseja realmente removê-lo?`;
    }

    BarberUI.showConfirm('Remover Horário', message, () => {
      BarberStorage.deleteSlot(slotId);
      BarberUI.showToast('Horário removido com sucesso.', 'info');
    });
  },

  renderAdminServices() {
    const container = document.getElementById('adminServicesList');
    const services = BarberStorage.getServices();

    if (services.length === 0) {
      container.innerHTML = `<div class="text-center text-gray-500 text-xs py-2">Nenhum serviço cadastrado.</div>`;
      return;
    }

    container.innerHTML = services.map(svc => `
      <div class="bg-dark-700 border border-gray-700/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
        <div>
          <div class="font-bold text-white">${svc.name}</div>
          <div class="text-gray-400"><span class="text-gold font-semibold">R$ ${parseFloat(svc.price).toFixed(2).replace('.', ',')}</span> • ${svc.duration}</div>
        </div>
        <button onclick="AdminModule.confirmDeleteService('${svc.id}', '${svc.name}')" 
                class="p-1.5 text-gray-400 hover:text-red-400 hover:bg-dark-600 rounded transition" title="Excluir Serviço">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `).join('');
  },

  handleAddService(event) {
    event.preventDefault();
    const name = document.getElementById('svcNameInput').value.trim();
    const price = parseFloat(document.getElementById('svcPriceInput').value);
    const duration = document.getElementById('svcDurationInput').value.trim();

    if (!name || isNaN(price) || !duration) {
      BarberUI.showToast('Preencha os dados do serviço corretamente.', 'error');
      return;
    }

    const newService = {
      id: 'svc_' + Date.now(),
      name: name,
      price: price,
      duration: duration,
      icon: 'fa-scissors'
    };

    BarberStorage.addService(newService);
    
    document.getElementById('svcNameInput').value = '';
    document.getElementById('svcPriceInput').value = '';
    document.getElementById('svcDurationInput').value = '';

    BarberUI.showToast(`Serviço "${name}" adicionado!`, 'success');
  },

  confirmDeleteService(serviceId, serviceName) {
    BarberUI.showConfirm(
      'Remover Serviço',
      `Deseja realmente excluir o serviço "${serviceName}"? Ele não aparecerá mais para os clientes.`,
      () => {
        BarberStorage.deleteService(serviceId);
        BarberUI.showToast('Serviço removido com sucesso.', 'info');
      }
    );
  },

  renderAdminBookings(filterTerm = '') {
    const container = document.getElementById('adminBookingsList');
    let bookings = BarberStorage.getBookings(this.currentDate);

    if (filterTerm) {
      const term = filterTerm.toLowerCase();
      bookings = bookings.filter(b => 
        b.customerName.toLowerCase().includes(term) || 
        b.customerPhone.includes(term) ||
        b.serviceName.toLowerCase().includes(term) ||
        (b.customerNotes && b.customerNotes.toLowerCase().includes(term))
      );
    }

    if (bookings.length === 0) {
      container.innerHTML = `
        <div class="py-8 text-center text-gray-500 text-xs">
          Nenhum agendamento encontrado para esta data.
        </div>
      `;
      return;
    }

    bookings.sort((a, b) => a.time.localeCompare(b.time));

    container.innerHTML = bookings.map(b => `
      <div class="bg-dark-700 border border-gray-700/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-gold/10 text-gold font-bold text-xs">${b.time}</span>
            <h4 class="font-bold text-white text-sm sm:text-base">${b.customerName}</h4>
          </div>
          <p class="text-xs text-gray-300"><i class="fa-solid fa-cut text-gold text-[10px] mr-1"></i> ${b.serviceName} - <span class="text-gold font-semibold">R$ ${parseFloat(b.servicePrice).toFixed(2).replace('.', ',')}</span></p>
          <p class="text-xs text-gray-400"><i class="fa-brands fa-whatsapp text-green-400 text-[10px] mr-1"></i> ${b.customerPhone}</p>
          ${b.customerNotes ? `<p class="text-xs text-gray-400 bg-dark-900/60 p-2 rounded border border-gray-800 mt-1"><i class="fa-regular fa-note-sticky text-gold mr-1"></i> <em>Obs: ${b.customerNotes}</em></p>` : ''}
        </div>

        <div class="flex items-center gap-2 self-end sm:self-center">
          <a href="https://wa.me/55${b.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${b.customerName}, confirmando seu agendamento na Barbearia Império para hoje às ${b.time}.`)}" 
             target="_blank" 
             class="px-3 py-1.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-green-500/30">
            <i class="fa-brands fa-whatsapp"></i> Contato
          </a>
          <button onclick="AdminModule.confirmCancelBooking('${b.id}', '${b.customerName}', '${b.time}')" 
                  class="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-red-500/30">
            <i class="fa-solid fa-xmark"></i> Cancelar
          </button>
        </div>
      </div>
    `).join('');
  },

  filterBookings(term) {
    this.renderAdminBookings(term);
  },

  confirmCancelBooking(bookingId, customerName, time) {
    BarberUI.showConfirm(
      'Cancelar Agendamento',
      `Tem certeza que deseja cancelar o agendamento de ${customerName} às ${time}? A vaga será liberada imediatamente.`,
      () => {
        BarberStorage.cancelBooking(bookingId);
        BarberUI.showToast('Agendamento cancelado e vaga liberada.', 'info');
      }
    );
  }
};

// Global Navigation & Controller
const AppController = {
  init() {
    initFirebase();
    BarberStorage.initDefaultData();
    CustomerModule.init();
  },

  switchTab(tabName) {
    if (tabName === 'admin') {
      AdminModule.promptPinModal();
      return;
    }

    AppState.activeTab = 'customer';
    document.getElementById('adminView').classList.add('hidden');
    document.getElementById('customerView').classList.remove('hidden');

    document.getElementById('navCustomerBtn').className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gold text-dark-900 shadow-md shadow-gold/20 flex items-center gap-2";
    document.getElementById('navAdminBtn').className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-gray-400 hover:text-white hover:bg-dark-700 flex items-center gap-2";

    CustomerModule.renderServices();
    CustomerModule.renderSlots();
  }
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  AppController.init();
});
