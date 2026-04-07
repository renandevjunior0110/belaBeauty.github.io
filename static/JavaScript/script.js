// ===== AGENDAMENTO ONLINE COM ARMAZENAMENTO COMPARTILHADO =====

let dataSelecionada = null;
let horarioSelecionado = null;
let currentDate = new Date();
let agendamentosServidor = {};

// Horários disponíveis
const horariosDisponiveis = [
    '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'
];

// Carregar agendamentos do servidor
async function carregarAgendamentos() {
    try {
        const response = await fetch('/api/agendamentos');
        agendamentosServidor = await response.json();
        renderCalendar(); // Recarrega o calendário com os dados atualizados
    } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
    }
}

// Salvar agendamento no servidor
async function salvarAgendamento(dados) {
    try {
        const response = await fetch('/api/agendamentos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados)
        });
        
        if (response.status === 409) {
            alert('Este horário acabou de ser ocupado! Por favor, escolha outro horário.');
            return false;
        }
        
        if (response.ok) {
            await carregarAgendamentos(); // Recarrega os dados atualizados
            return true;
        }
        
        alert('Erro ao realizar agendamento. Tente novamente.');
        return false;
    } catch (error) {
        console.error('Erro ao salvar agendamento:', error);
        alert('Erro de conexão. Tente novamente.');
        return false;
    }
}

// Verificar se uma data tem horários disponíveis
function isDateAvailable(date) {
    const dateStr = date.toISOString().split('T')[0];
    const agendamentosData = agendamentosServidor[dateStr] || [];
    return agendamentosData.length < horariosDisponiveis.length;
}

// Verificar se um horário específico está ocupado
function isHorarioOcupado(date, horario) {
    const dateStr = date.toISOString().split('T')[0];
    const agendamentosData = agendamentosServidor[dateStr] || [];
    // Só bloqueia se for CONFIRMADO
    return agendamentosData.some(a => a.horario === horario && a.status === 'confirmado');
}


// Inicializar calendário
function initCalendar() {
    carregarAgendamentos();
    renderCalendar();
    
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
        resetSelecoes();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
        resetSelecoes();
    });
    
    document.getElementById('servico').addEventListener('change', () => {
        if (dataSelecionada) {
            mostrarHorarios(dataSelecionada);
        }
    });
    
    document.getElementById('confirmarAgendamento').addEventListener('click', confirmarAgendamento);
    document.getElementById('enviarWhatsApp').addEventListener('click', enviarMensagemWhatsApp);
    document.getElementById('fecharModal').addEventListener('click', fecharModal);
    document.querySelector('.modal-fechar').addEventListener('click', fecharModal);
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    document.getElementById('monthYear').textContent = `${monthNames[month]} ${year}`;
    
    const calendarDays = document.getElementById('calendario-dias');
    calendarDays.innerHTML = '';
    
    // Dias do mês anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dayDiv = createDayElement(day, true);
        calendarDays.appendChild(dayDiv);
    }
    
    // Dias do mês atual
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isAvailable = isDateAvailable(date);
        const isPast = date < today;
        const dayDiv = createDayElement(day, false, date, isAvailable && !isPast);
        calendarDays.appendChild(dayDiv);
    }
    
    // Dias do próximo mês
    const remainingDays = 42 - (startDayOfWeek + daysInMonth);
    for (let day = 1; day <= remainingDays; day++) {
        const dayDiv = createDayElement(day, true);
        calendarDays.appendChild(dayDiv);
    }
}

function createDayElement(day, isOtherMonth, date = null, isSelectable = true) {
    const dayDiv = document.createElement('div');
    dayDiv.textContent = day;
    dayDiv.classList.add('dia');
    
    if (isOtherMonth) {
        dayDiv.classList.add('dia-outro-mes');
    } else if (!isSelectable) {
        dayDiv.classList.add('dia-indisponivel');
    } else {
        dayDiv.style.cursor = 'pointer';
        dayDiv.addEventListener('click', () => selecionarData(date));
    }
    
    if (date && dataSelecionada && date.toDateString() === dataSelecionada.toDateString()) {
        dayDiv.classList.add('dia-selecionado');
    }
    
    return dayDiv;
}

function selecionarData(date) {
    const servico = document.getElementById('servico').value;
    if (!servico) {
        alert('Por favor, selecione um serviço primeiro!');
        return;
    }
    
    dataSelecionada = date;
    renderCalendar();
    mostrarHorarios(date);
}

function mostrarHorarios(date) {
    const horariosHTML = horariosDisponiveis.map(horario => {
        const isOcupado = isHorarioOcupado(date, horario);
        const classe = isOcupado ? 'horario-btn horario-ocupado' : 'horario-btn';
        const disabled = isOcupado ? 'disabled' : '';
        return `<button class="${classe}" data-horario="${horario}" ${disabled}>${horario}</button>`;
    }).join('');
    
    document.getElementById('horariosList').innerHTML = horariosHTML;
    document.getElementById('horarioSelector').style.display = 'block';
    document.getElementById('clienteDados').style.display = 'none';
    horarioSelecionado = null;
    
    document.querySelectorAll('.horario-btn:not(.horario-ocupado)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('horario-selecionado'));
            btn.classList.add('horario-selecionado');
            horarioSelecionado = btn.dataset.horario;
            document.getElementById('clienteDados').style.display = 'block';
        });
    });
}

function resetSelecoes() {
    dataSelecionada = null;
    horarioSelecionado = null;
    document.getElementById('horarioSelector').style.display = 'none';
    document.getElementById('clienteDados').style.display = 'none';
}

async function confirmarAgendamento() {
    const nome = document.getElementById('clienteNome').value.trim();
    const email = document.getElementById('clienteEmail').value.trim();
    const telefone = document.getElementById('clienteTelefone').value.trim();
    const servico = document.getElementById('servico').value;
    
    if (!nome || !email || !telefone) {
        alert('Por favor, preencha todos os dados!');
        return;
    }
    
    if (!dataSelecionada || !horarioSelecionado) {
        alert('Por favor, selecione data e horário!');
        return;
    }
    
    // Verificar novamente se o horário ainda está disponível
    if (isHorarioOcupado(dataSelecionada, horarioSelecionado)) {
        alert('Este horário acabou de ser ocupado! Por favor, escolha outro horário.');
        mostrarHorarios(dataSelecionada);
        return;
    }
    
    const dateStr = dataSelecionada.toISOString().split('T')[0];
    const dataFormatada = dataSelecionada.toLocaleDateString('pt-BR');
    
    const agendamento = {
        nome,
        email,
        telefone,
        servico,
        data: dateStr,
        horario: horarioSelecionado
    };
    
    // Salvar no servidor
    const sucesso = await salvarAgendamento(agendamento);
    
    if (sucesso) {
        // Preparar mensagem do modal
        const modalMensagem = `
            <p><strong>${nome}</strong>, seu agendamento foi confirmado!</p>
            <p>📅 <strong>Data:</strong> ${dataFormatada}</p>
            <p>⏰ <strong>Horário:</strong> ${horarioSelecionado}</p>
            <p>💇 <strong>Serviço:</strong> ${servico}</p>
            <p>📍 <strong>Endereço:</strong> Av deputado borsari neto 64, Sarandi, PR</p>
            <p style="margin-top: 1rem;">🔔 Clique no botão abaixo para enviar a mensagem de confirmação para o <strong>Studio Bela</strong> via WhatsApp!</p>
            <p style="font-size: 0.9rem; color: #666;">*O estúdio receberá sua solicitação e retornará em breve*</p>
        `;
        
        document.getElementById('modalMensagem').innerHTML = modalMensagem;
        document.getElementById('modalConfirmacao').style.display = 'flex';
        
        // Armazenar dados para o WhatsApp
        window.ultimoAgendamento = { ...agendamento, dataFormatada };
        
        // Limpar formulário
        document.getElementById('clienteNome').value = '';
        document.getElementById('clienteEmail').value = '';
        document.getElementById('clienteTelefone').value = '';
        document.getElementById('servico').value = '';
        resetSelecoes();
        
        // Recarregar horários para atualizar a interface
        if (dataSelecionada) {
            mostrarHorarios(dataSelecionada);
        }
    }
}

function enviarMensagemWhatsApp() {
    if (!window.ultimoAgendamento) return;
    
    const a = window.ultimoAgendamento;
    const numeroStudio = "5544997097159";
    
    const mensagem = `🆕 *NOVO AGENDAMENTO - STUDIO BELA*\n\n` +
        `👤 *Cliente:* ${a.nome}\n` +
        `📧 *E-mail:* ${a.email}\n` +
        `📱 *WhatsApp:* ${a.telefone}\n` +
        `📅 *Data:* ${a.dataFormatada}\n` +
        `⏰ *Horário:* ${a.horario}\n` +
        `💇 *Serviço:* ${a.servico}\n\n` +
        `✅ *Status:* Aguardando confirmação\n\n` +
        `_Mensagem enviada automaticamente pelo site_`;
    
    const url = `https://wa.me/${numeroStudio}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

function fecharModal() {
    document.getElementById('modalConfirmacao').style.display = 'none';
    window.ultimoAgendamento = null;
}

// Efeito Ripple para botões
function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size/2}px`;
    ripple.style.top = `${event.clientY - rect.top - size/2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

document.querySelectorAll('.btn-agendar, .horario-btn, .cal-nav-btn').forEach(btn => {
    btn.addEventListener('click', createRipple);
});

// Inicializar tudo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
    
    // Smooth scroll para links de navegação
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

        // ===== ACESSO ADMIN COM SENHA =====
    const ADMIN_SENHA = 'bela123'; // Altere para a senha que você quiser

    const adminAccessBtn = document.getElementById('adminAccessBtn');
    const adminPasswordModal = document.getElementById('adminPasswordModal');
    const closePasswordModal = document.getElementById('closePasswordModal');
    const confirmAdminPassword = document.getElementById('confirmAdminPassword');
    const adminPasswordInput = document.getElementById('adminPassword');

    // Abrir modal de senha
    if (adminAccessBtn) {
        adminAccessBtn.addEventListener('click', () => {
            adminPasswordModal.style.display = 'flex';
            adminPasswordInput.value = '';
            adminPasswordInput.focus();
        });
    }

    // Fechar modal
    if (closePasswordModal) {
        closePasswordModal.addEventListener('click', () => {
            adminPasswordModal.style.display = 'none';
        });
    }

    // Verificar senha e redirecionar
    if (confirmAdminPassword) {
        confirmAdminPassword.addEventListener('click', () => {
            const senhaDigitada = adminPasswordInput.value;
            
            if (senhaDigitada === ADMIN_SENHA) {
                // Senha correta - redirecionar para o painel admin
                window.location.href = '/admin';
            } else {
                // Senha errada
                alert('❌ Senha incorreta! Acesso negado.');
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
                
                // Efeito de erro
                adminPasswordInput.style.borderColor = '#f44336';
                setTimeout(() => {
                    adminPasswordInput.style.borderColor = '';
                }, 1000);
            }
        });
    }

    // Permitir enviar com Enter
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                confirmAdminPassword.click();
            }
        });
    }

    // Fechar modal clicando fora
    window.addEventListener('click', (e) => {
        if (e.target === adminPasswordModal) {
            adminPasswordModal.style.display = 'none';
        }
    });


});