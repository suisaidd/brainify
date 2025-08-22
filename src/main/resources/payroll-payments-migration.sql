-- Миграция для создания таблицы payroll_payments
-- Таблица для отслеживания оплаченных смет преподавателей

CREATE TABLE IF NOT EXISTS payroll_payments (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL,
    payment_year INTEGER NOT NULL,
    payment_month INTEGER NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    expected_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_date TIMESTAMP NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    excel_file_path VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Внешние ключи
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Индексы
    CONSTRAINT fk_payroll_payments_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_payroll_payments_teacher ON payroll_payments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_year_month ON payroll_payments(payment_year, payment_month);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_status ON payroll_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_type ON payroll_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_created_at ON payroll_payments(created_at);

-- Уникальный индекс для предотвращения дублирования смет
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_payments_unique 
ON payroll_payments(teacher_id, payment_year, payment_month, payment_type);

-- Комментарии к таблице
COMMENT ON TABLE payroll_payments IS 'Таблица для отслеживания оплаченных смет преподавателей';
COMMENT ON COLUMN payroll_payments.teacher_id IS 'ID преподавателя';
COMMENT ON COLUMN payroll_payments.payment_year IS 'Год сметы';
COMMENT ON COLUMN payroll_payments.payment_month IS 'Месяц сметы';
COMMENT ON COLUMN payroll_payments.payment_type IS 'Тип сметы: current-payroll, past-payroll, monthly-payroll';
COMMENT ON COLUMN payroll_payments.expected_amount IS 'Ожидаемая сумма к выплате';
COMMENT ON COLUMN payroll_payments.paid_amount IS 'Фактически выплаченная сумма';
COMMENT ON COLUMN payroll_payments.payment_date IS 'Дата выплаты';
COMMENT ON COLUMN payroll_payments.payment_status IS 'Статус: pending, paid';
COMMENT ON COLUMN payroll_payments.excel_file_path IS 'Путь к Excel файлу со сметой';
COMMENT ON COLUMN payroll_payments.created_at IS 'Дата создания записи';
