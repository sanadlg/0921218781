from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# تحديث رابط قاعدة البيانات ليتناسب مع بيئة الإنتاج
database_url = os.environ.get('DATABASE_URL', 'sqlite:///banks.db')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_recycle': 3600,
    'pool_pre_ping': True
}
db = SQLAlchemy(app)

class Bank(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200))
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    visits = db.relationship('Visit', backref='bank', lazy=True)

class Visit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bank_id = db.Column(db.Integer, db.ForeignKey('bank.id'), nullable=False)
    visit_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    notes = db.Column(db.Text)

# التحقق من وجود قاعدة البيانات وإنشائها مع بيانات أولية
def init_db():
    with app.app_context():
        try:
            db.create_all()
            # التحقق من وجود بيانات أولية
            if Bank.query.count() == 0:
                print("إضافة بيانات أولية...")
                initial_banks = [
                    Bank(
                        name="مصرف الوحدة",
                        address="شارع عمر المختار، طرابلس",
                        lat=32.8872,
                        lng=13.1913
                    ),
                    Bank(
                        name="مصرف الجمهورية",
                        address="شارع 24 ديسمبر، طرابلس",
                        lat=32.8972,
                        lng=13.1813
                    ),
                    Bank(
                        name="مصرف الصحارى",
                        address="شارع بن عاشور، طرابلس",
                        lat=32.8772,
                        lng=13.2013
                    )
                ]
                db.session.add_all(initial_banks)
                db.session.commit()
                print("تم إضافة البيانات الأولية")
        except Exception as e:
            print(f"خطأ في تهيئة قاعدة البيانات: {str(e)}")
            db.session.rollback()

# تهيئة قاعدة البيانات عند تشغيل التطبيق
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/selected-banks')
def selected_banks():
    return render_template('selected_banks.html')

@app.route('/api/banks', methods=['GET'])
def get_banks():
    try:
        banks = Bank.query.all()
        return jsonify([{
            'id': bank.id,
            'name': bank.name,
            'address': bank.address,
            'lat': bank.lat,
            'lng': bank.lng,
            'completed': bank.completed
        } for bank in banks])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/banks', methods=['POST'])
def add_bank():
    try:
        data = request.json
        new_bank = Bank(
            name=data['name'],
            address=data['address'],
            lat=data['lat'],
            lng=data['lng']
        )
        db.session.add(new_bank)
        db.session.commit()
        return jsonify({
            'id': new_bank.id,
            'name': new_bank.name,
            'address': new_bank.address,
            'lat': new_bank.lat,
            'lng': new_bank.lng,
            'completed': new_bank.completed
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/banks/<int:bank_id>/complete', methods=['POST'])
def complete_bank(bank_id):
    try:
        bank = Bank.query.get_or_404(bank_id)
        bank.completed = not bank.completed
        db.session.commit()
        return jsonify({
            'id': bank.id,
            'completed': bank.completed
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/banks/<int:bank_id>/visits', methods=['POST'])
def add_visit(bank_id):
    try:
        bank = Bank.query.get_or_404(bank_id)
        data = request.json
        new_visit = Visit(
            bank_id=bank_id,
            notes=data.get('notes', '')
        )
        db.session.add(new_visit)
        db.session.commit()
        return jsonify({
            'id': new_visit.id,
            'bank_id': new_visit.bank_id,
            'visit_date': new_visit.visit_date.isoformat(),
            'notes': new_visit.notes
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 