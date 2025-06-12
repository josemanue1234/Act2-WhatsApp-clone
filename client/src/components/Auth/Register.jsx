import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const RegisterSchema = Yup.object().shape({
  username: Yup.string()
    .required('El nombre de usuario es requerido')
    .min(3, 'Mínimo 3 caracteres')
    .max(20, 'Máximo 20 caracteres'),
  phone: Yup.string()
    .required('El teléfono es requerido')
    .matches(/^[0-9]+$/, "Debe ser solo números")
    .min(10, 'Mínimo 10 caracteres')
    .max(15, 'Máximo 15 caracteres'),
  password: Yup.string()
    .required('La contraseña es requerida')
    .min(6, 'Mínimo 6 caracteres'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Las contraseñas deben coincidir')
    .required('Confirma tu contraseña')
});

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Registro</h2>
        
        <Formik
          initialValues={{ username: '', phone: '', password: '', confirmPassword: '' }}
          validationSchema={RegisterSchema}
          onSubmit={async (values, { setSubmitting }) => {
            setServerError('');
            const { success, error } = await register(values.username, values.phone, values.password);
            if (!success) {
              setServerError(error);
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form>
              <div className="form-group">
                <label>Nombre de Usuario</label>
                <Field type="text" name="username" placeholder="Ingresa tu nombre" />
                <ErrorMessage name="username" component="div" className="error-message" />
              </div>

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

              <div className="form-group">
                <label>Confirmar Contraseña</label>
                <Field type="password" name="confirmPassword" placeholder="Confirma tu contraseña" />
                <ErrorMessage name="confirmPassword" component="div" className="error-message" />
              </div>

              {serverError && <div className="server-error">{serverError}</div>}

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Registrando...' : 'Registrarse'}
              </button>
            </Form>
          )}
        </Formik>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <span onClick={() => navigate('/')}>Inicia Sesión</span>
        </p>
      </div>
    </div>
  );
};

export default Register;