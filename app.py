from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import json
import os
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
app.secret_key = 'studio_bela_secret_key_2024'  # Troque por uma senha segura

# Arquivos
AGENDAMENTOS_FILE = 'agendamentos.json'
ADMIN_FILE = 'admin.json'

# Credenciais do admin (você pode mudar depois)
def get_admin_credentials():
    if os.path.exists(ADMIN_FILE):
        with open(ADMIN_FILE, 'r') as f:
            return json.load(f)
    else:
        # Credenciais padrão - MUDAR DEPOIS!
        default = {'username': 'admin', 'password': 'bela123'}
        with open(ADMIN_FILE, 'w') as f:
            json.dump(default, f)
        return default

def carregar_agendamentos():
    """Carrega os agendamentos do arquivo JSON"""
    if os.path.exists(AGENDAMENTOS_FILE):
        with open(AGENDAMENTOS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def salvar_agendamentos(agendamentos):
    """Salva os agendamentos no arquivo JSON"""
    with open(AGENDAMENTOS_FILE, 'w', encoding='utf-8') as f:
        json.dump(agendamentos, f, ensure_ascii=False, indent=2)

def limpar_agendamentos_expirados():
    """Remove agendamentos pendentes com mais de 24h"""
    agendamentos = carregar_agendamentos()
    modificado = False
    agora = datetime.now()
    
    for data in list(agendamentos.keys()):
        for agendamento in list(agendamentos[data]):
            if agendamento.get('status') == 'pendente':
                timestamp = datetime.fromisoformat(agendamento['timestamp'])
                if agora - timestamp > timedelta(hours=24):
                    agendamentos[data].remove(agendamento)
                    modificado = True
        
        # Remove data vazia
        if len(agendamentos[data]) == 0:
            del agendamentos[data]
            modificado = True
    
    if modificado:
        salvar_agendamentos(agendamentos)
    
    return agendamentos

# Decorador para verificar login admin
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/agendamentos", methods=["GET"])
def get_agendamentos():
    """Retorna apenas agendamentos confirmados para o público"""
    todos = carregar_agendamentos()
    # Para o público, mostrar apenas confirmados
    publicos = {}
    for data, agendamentos in todos.items():
        confirmados = [a for a in agendamentos if a.get('status') == 'confirmado']
        if confirmados:
            publicos[data] = confirmados
    return jsonify(publicos)

@app.route("/api/agendamentos/todos", methods=["GET"])
@login_required
def get_all_agendamentos():
    """Retorna todos os agendamentos (admin)"""
    agendamentos = limpar_agendamentos_expirados()
    return jsonify(agendamentos)

@app.route("/api/agendamentos", methods=["POST"])
def post_agendamento():
    """Salva um novo agendamento como pendente"""
    dados = request.json
    
    # Carregar agendamentos existentes
    agendamentos = carregar_agendamentos()
    
    data = dados.get('data')
    horario = dados.get('horario')
    
    # Verificar se o horário já está confirmado
    if data in agendamentos:
        for agendamento in agendamentos[data]:
            if agendamento['horario'] == horario and agendamento.get('status') == 'confirmado':
                return jsonify({'erro': 'Horário já confirmado!'}), 409
    
    # Adicionar novo agendamento como pendente
    if data not in agendamentos:
        agendamentos[data] = []
    
    novo_agendamento = {
        'id': f"{data}_{horario}_{datetime.now().timestamp()}",
        'nome': dados.get('nome'),
        'email': dados.get('email'),
        'telefone': dados.get('telefone'),
        'servico': dados.get('servico'),
        'horario': horario,
        'status': 'pendente',
        'timestamp': datetime.now().isoformat()
    }
    
    agendamentos[data].append(novo_agendamento)
    salvar_agendamentos(agendamentos)
    return jsonify({'sucesso': True, 'mensagem': 'Solicitação enviada! Aguarde confirmação.'})

@app.route("/api/agendamentos/<id>", methods=["PUT"])
@login_required
def update_agendamento(id):
    """Atualiza status do agendamento (confirmar/cancelar)"""
    dados = request.json
    novo_status = dados.get('status')
    
    agendamentos = carregar_agendamentos()
    
    for data, agendamentos_lista in agendamentos.items():
        for agendamento in agendamentos_lista:
            if agendamento.get('id') == id:
                agendamento['status'] = novo_status
                agendamento['atualizado_em'] = datetime.now().isoformat()
                salvar_agendamentos(agendamentos)
                return jsonify({'sucesso': True})
    
    return jsonify({'erro': 'Agendamento não encontrado'}), 404

@app.route("/admin")
@login_required
def admin_panel():
    return render_template("admin.html")

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get('username')
        password = request.form.get('password')
        creds = get_admin_credentials()
        
        if username == creds['username'] and password == creds['password']:
            session['admin_logged_in'] = True
            return redirect(url_for('admin_panel'))
        else:
            return render_template("admin_login.html", erro="Credenciais inválidas!")
    
    return render_template("admin_login.html")

@app.route("/admin/logout")
def admin_logout():
    session.clear()
    return redirect(url_for('admin_login'))

if __name__ == "__main__":
    app.run(debug=True)