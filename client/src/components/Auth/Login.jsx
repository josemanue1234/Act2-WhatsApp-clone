import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const LoginSchema = Yup.object().shape({
  phone: Yup.string()
    .required('El teléfono es requerido')
    .matches(/^[0-9]+$/, "Debe ser solo números")
    .min(10, 'Mínimo 10 caracteres')
    .max(15, 'Máximo 15 caracteres'),
  password: Yup.string()
    .required('La contraseña es requerida')
    .min(6, 'Mínimo 6 caracteres')
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Iniciar Sesión</h2>
        
        <Formik
          initialValues={{ phone: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={async (values, { setSubmitting }) => {
            setServerError('');
            const { success, error } = await login(values.phone, values.password);
            if (!success) {
              setServerError(error);
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form>
              <div className="form-group">
                <label>Teléfono</label>
                <Field type="text" name="phone" placeholder="Ingresa tu teléfono" />
                <ErrorMessage name="phone" component="div" className="error-message" />
              </div>

              <div className="form-group">
                <label>Contraseña</label>
                <Field type="password" name="password" placeholder="Ingresa tu contraseña" />
                <ErrorMessage name="password" component="div" className="error-message" />
              </div>

              {serverError && <div className="server-error">{serverError}</div>}

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Iniciando...' : 'Iniciar Sesión'}
              </button>
            </Form>
          )}
        </Formik>

        <p className="auth-footer">
          ¿No tienes cuenta? <span onClick={() => navigate('/register')}>Regístrate</span>
        </p>
      </div>
    </div>
  );
};

export default Login;