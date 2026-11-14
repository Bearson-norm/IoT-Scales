-- Default login accounts only (no master/operational sample data)
-- Passwords are set to known values by update-user-passwords.sql or setup-database.bat step 12

INSERT INTO master_user (username, name, email, password_hash, role) VALUES
('faliq', 'Faliq', 'faliq@presisitech.com', '$2b$10$example_hash', 'operator'),
('admin', 'Administrator', 'admin@presisitech.com', '$2b$10$example_hash', 'admin'),
('operator1', 'Operator 1', 'operator1@presisitech.com', '$2b$10$example_hash', 'operator'),
('supervisor', 'Supervisor', 'supervisor@presisitech.com', '$2b$10$example_hash', 'supervisor');
