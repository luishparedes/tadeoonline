// Configuración del sistema
const TADEO = {
    tickets: JSON.parse(localStorage.getItem('tadeo_tickets')) || [],
    winners: JSON.parse(localStorage.getItem('tadeo_winners')) || [],
    earnings: parseFloat(localStorage.getItem('tadeo_earnings')) || 0,
    systemActive: localStorage.getItem('tadeo_active') !== 'false',
    ticketPrices: [0.20, 0.30, 0.40, 0.50, 1.00],
    profitPercentage: 0.3, // 30% para el sistema
    prizeMultiplier: 3, // Triplica el premio
    drawTime: { hours: 18, minutes: 0 } // 6:00 PM
};

// Inicialización del sistema
document.addEventListener('DOMContentLoaded', function() {
    // Configuración inicial
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // Elementos del DOM
    const elements = {
        ticketForm: document.getElementById('ticketForm'),
        ticketList: document.getElementById('ticketList'),
        allTickets: document.getElementById('allTickets'),
        drawButton: document.getElementById('drawButton'),
        printWinners: document.getElementById('printWinners'),
        toggleSystem: document.getElementById('toggleSystem'),
        collectEarnings: document.getElementById('collectEarnings'),
        adminPanel: document.getElementById('adminPanel'),
        ticketPrice: document.getElementById('ticketPrice'),
        earningsDisplay: document.getElementById('earnings'),
        winner1: document.getElementById('winner1'),
        winner2: document.getElementById('winner2'),
        winner3: document.getElementById('winner3'),
        countdown: document.getElementById('countdown'),
        amountSelect: document.getElementById('amount'),
        nameInput: document.getElementById('name'),
        phoneInput: document.getElementById('phone'),
        numberInput: document.getElementById('number')
    };
    
    // Mostrar panel admin si la URL tiene parámetro admin
    if (new URLSearchParams(window.location.search).has('admin')) {
        elements.adminPanel.classList.remove('hidden');
    }
    
    // Event listeners
    elements.amountSelect.addEventListener('change', updateTicketPrice);
    elements.ticketForm.addEventListener('submit', handleTicketPurchase);
    elements.drawButton.addEventListener('click', performDraw);
    elements.printWinners.addEventListener('click', printWinners);
    elements.toggleSystem.addEventListener('click', toggleSystem);
    elements.collectEarnings.addEventListener('click', collectEarnings);
    
    // Inicializar UI
    updateTicketPrice();
    updateTicketList();
    updateAllTicketsList();
    updateWinnersDisplay();
    updateCountdown();
    updateEarningsDisplay();
    elements.toggleSystem.textContent = TADEO.systemActive ? 'Desactivar Sistema' : 'Activar Sistema';
    
    // Configurar intervalo para el countdown
    setInterval(updateCountdown, 1000);
    
    // Funciones del sistema
    function updateTicketPrice() {
        elements.ticketPrice.textContent = elements.amountSelect.value;
    }
    
    function handleTicketPurchase(e) {
        e.preventDefault();
        
        if (!TADEO.systemActive) {
            alert('El sistema está desactivado temporalmente.');
            return;
        }
        
        const name = elements.nameInput.value.trim();
        const phone = elements.phoneInput.value.trim();
        const amount = parseFloat(elements.amountSelect.value);
        const number = elements.numberInput.value.padStart(3, '0');
        
        // Validaciones
        if (!name || !phone) {
            alert('Por favor complete todos los campos.');
            return;
        }
        
        if (number < 0 || number > 999) {
            alert('Por favor ingrese un número entre 000 y 999');
            return;
        }
        
        // Verificar si el número ya fue comprado hoy
        const isDuplicate = TADEO.tickets.some(t => 
            t.number === number && 
            new Date(t.date).toDateString() === new Date().toDateString()
        );
        
        if (isDuplicate) {
            alert('Este número ya ha sido comprado hoy. Por favor elija otro.');
            return;
        }
        
        // Crear ticket
        const ticket = {
            id: Date.now(),
            name,
            phone,
            amount,
            number,
            date: new Date().toISOString(),
            winner: false
        };
        
        TADEO.tickets.push(ticket);
        saveData('tadeo_tickets', TADEO.tickets);
        
        // Calcular ganancias
        TADEO.earnings += amount * TADEO.profitPercentage;
        saveData('tadeo_earnings', TADEO.earnings);
        
        // Actualizar UI
        updateTicketList();
        updateAllTicketsList();
        updateEarningsDisplay();
        
        // Resetear formulario
        elements.ticketForm.reset();
        elements.ticketPrice.textContent = '0.20';
        
        alert(`Ticket #${number} comprado exitosamente por $${amount.toFixed(2)}. ¡Buena suerte!`);
    }
    
    function performDraw() {
        if (TADEO.tickets.length < 1) {
            alert('Se necesitan tickets vendidos para realizar un sorteo.');
            return;
        }
        
        // Seleccionar ganadores (mínimo 1, máximo 3)
        const winnerCount = Math.min(3, TADEO.tickets.length);
        const shuffled = [...TADEO.tickets].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, winnerCount);
        
        // Calcular premio total disponible (70% de lo vendido)
        const totalPrizePool = TADEO.tickets.reduce((sum, t) => sum + t.amount, 0) * (1 - TADEO.profitPercentage);
        
        // Distribuir premios (50% para 1ro, 30% para 2do, 20% para 3ro)
        const prizeDistribution = [0.5, 0.3, 0.2];
        const prizes = [];
        
        for (let i = 0; i < winnerCount; i++) {
            prizes.push(totalPrizePool * prizeDistribution[i]);
        }
        
        // Marcar ganadores y asignar premios
        selected.forEach((winner, index) => {
            winner.winner = true;
            winner.prize = index + 1;
            winner.winAmount = prizes[index];
        });
        
        // Guardar ganadores
        TADEO.winners.unshift({
            date: new Date().toISOString(),
            winners: selected.map((w, i) => ({
                number: w.number,
                name: w.name,
                amount: w.amount,
                winAmount: prizes[i],
                prizePosition: i + 1
            })),
            totalSales: TADEO.tickets.reduce((sum, t) => sum + t.amount, 0),
            totalPrizes: totalPrizePool
        });
        
        // Limpiar tickets del día
        TADEO.tickets = [];
        
        // Guardar cambios
        saveData('tadeo_tickets', TADEO.tickets);
        saveData('tadeo_winners', TADEO.winners);
        
        // Actualizar UI
        updateTicketList();
        updateAllTicketsList();
        updateWinnersDisplay();
        
        alert(`¡Sorteo realizado con éxito! ${winnerCount} ganador(es) seleccionado(s).`);
    }
    
    function printWinners() {
        if (TADEO.winners.length === 0) {
            alert('No hay ganadores para imprimir.');
            return;
        }
        
        const latestWinners = TADEO.winners[0];
        const printContent = `
            <div id="printSection">
                <h1 style="text-align:center;">Resultados TADEO</h1>
                <p style="text-align:center;">${new Date(latestWinners.date).toLocaleString()}</p>
                <h2 style="text-align:center;">Ganadores del Día</h2>
                ${latestWinners.winners.map(winner => `
                    <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                        <h3 style="color: #e74c3c;">${winner.prizePosition}° Premio: #${winner.number}</h3>
                        <p><strong>Nombre:</strong> ${winner.name}</p>
                        <p><strong>Ticket:</strong> $${winner.amount.toFixed(2)}</p>
                        <p><strong>Premio:</strong> $${winner.winAmount.toFixed(2)}</p>
                    </div>
                `).join('')}
                <div style="margin-top: 30px;">
                    <p><strong>Total vendido:</strong> $${latestWinners.totalSales.toFixed(2)}</p>
                    <p><strong>Total premios:</strong> $${latestWinners.totalPrizes.toFixed(2)}</p>
                </div>
            </div>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Resultados TADEO</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1, h2, h3 { color: #2c3e50; }
                        @media print {
                            body { padding: 0; }
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <button onclick="window.print()" style="display: block; margin: 20px auto; padding: 10px 20px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Imprimir Resultados
                    </button>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
    
    function toggleSystem() {
        TADEO.systemActive = !TADEO.systemActive;
        saveData('tadeo_active', TADEO.systemActive);
        elements.toggleSystem.textContent = TADEO.systemActive ? 'Desactivar Sistema' : 'Activar Sistema';
        alert(`Sistema ${TADEO.systemActive ? 'activado' : 'desactivado'} con éxito.`);
    }
    
    function collectEarnings() {
        if (TADEO.earnings <= 0) {
            alert('No hay ganancias para recolectar.');
            return;
        }
        
        alert(`Ganancias de $${TADEO.earnings.toFixed(2)} recolectadas con éxito.`);
        TADEO.earnings = 0;
        saveData('tadeo_earnings', TADEO.earnings);
        updateEarningsDisplay();
    }
    
    // Funciones de actualización de UI
    function updateTicketList() {
        const todayTickets = TADEO.tickets.filter(t => 
            new Date(t.date).toDateString() === new Date().toDateString()
        );
        
        if (todayTickets.length === 0) {
            elements.ticketList.innerHTML = '<p>No hay tickets vendidos todavía</p>';
            return;
        }
        
        elements.ticketList.innerHTML = todayTickets.map(ticket => `
            <div class="ticket-item">
                <span class="ticket-number">#${ticket.number}</span>
                <span>${ticket.name}</span>
                <span class="ticket-amount">$${ticket.amount.toFixed(2)}</span>
            </div>
        `).join('');
    }
    
    function updateAllTicketsList() {
        const allTicketsData = [
            ...TADEO.tickets, 
            ...TADEO.winners.flatMap(w => w.winners)
        ];
        
        if (allTicketsData.length === 0) {
            elements.allTickets.innerHTML = '<p>No hay tickets en el sistema</p>';
            return;
        }
        
        elements.allTickets.innerHTML = allTicketsData.map(ticket => `
            <div class="ticket-item">
                <span class="ticket-number">#${ticket.number}</span>
                <span>${ticket.name}</span>
                <span>$${ticket.amount.toFixed(2)}</span>
                <span>${ticket.winner ? `Ganador $${ticket.winAmount.toFixed(2)}` : ''}</span>
            </div>
        `).join('');
    }
    
    function updateWinnersDisplay() {
        if (TADEO.winners.length > 0) {
            const latestWinners = TADEO.winners[0].winners;
            elements.winner1.textContent = latestWinners[0] ? `#${latestWinners[0].number} - ${latestWinners[0].name}` : '---';
            elements.winner2.textContent = latestWinners[1] ? `#${latestWinners[1].number} - ${latestWinners[1].name}` : '---';
            elements.winner3.textContent = latestWinners[2] ? `#${latestWinners[2].number} - ${latestWinners[2].name}` : '---';
        }
    }
    
    function updateCountdown() {
        const now = new Date();
        let drawTime = new Date();
        
        drawTime.setHours(TADEO.drawTime.hours, TADEO.drawTime.minutes, 0, 0);
        
        if (now > drawTime) {
            drawTime.setDate(drawTime.getDate() + 1);
        }
        
        const diff = drawTime - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        elements.countdown.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Realizar sorteo automático si es hora
        if (hours === 0 && minutes === 0 && seconds === 0 && TADEO.systemActive) {
            performDraw();
        }
    }
    
    function updateEarningsDisplay() {
        elements.earningsDisplay.textContent = TADEO.earnings.toFixed(2);
    }
    
    // Función auxiliar para guardar datos
    function saveData(key, value) {
        localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
    }
});
