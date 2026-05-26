import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updatePerfil, eliminarCuenta } from '../api/auth'
import Topbar from '../components/Topbar'
import { AVATAR_DEFAULT } from '../utils/imagenes'
import CustomAlertModal from '../components/CustomAlertModal'
import Breadcrumb from '../components/ui/Breadcrumb'
import Cropper from 'react-easy-crop'
import getCroppedImg from '../utils/cropImage'

export default function PerfilPage() {
  const { usuario, loginUsuario, logout } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState(usuario?.nombre || '')
  const [correo, setCorreo] = useState(usuario?.correo || '')
  const [contrasenaActual, setContrasenaActual] = useState('')
  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  // Estados de foto de perfil
  const [fotoPerfilFile, setFotoPerfilFile] = useState(null)
  const [fotoPerfilPreview, setFotoPerfilPreview] = useState(AVATAR_DEFAULT)  // HARDCODED
  // ANTES: useState(usuario?.foto_perfil_url || '')

  // Estados del cropper
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [tempImage, setTempImage] = useState(null)

  // Estado para modal de alerta
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    theme: 'green',
  })

  // Estado para modal de confirmación de eliminación de cuenta
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  async function handleEliminarCuenta() {
    try {
      setCargando(true)
      setError('')
      await eliminarCuenta()
      setConfirmDeleteOpen(false)
      logout()
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function handleFotoChange(e) {
    const file = e.target.files[0]
    if (file) {
      const imageUrl = URL.createObjectURL(file)
      setTempImage(imageUrl)
      setIsCropModalOpen(true)
      e.target.value = null // permite seleccionar el mismo archivo de nuevo si es necesario
    }
  }

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const guardarCrop = async () => {
    try {
      setCargando(true)
      const croppedImageBlob = await getCroppedImg(tempImage, croppedAreaPixels)
      const croppedFile = new File([croppedImageBlob], "profile_crop.jpg", { type: "image/jpeg" })
      
      const formData = new FormData()
      formData.append('nombre', nombre)
      formData.append('correo', correo)
      formData.append('foto_perfil', croppedFile)
      
      const updatedUser = await updatePerfil(formData)
      loginUsuario({ usuario: updatedUser })
      
      setFotoPerfilFile(null)
      setFotoPerfilPreview(updatedUser.foto_perfil_url)
      setIsCropModalOpen(false)
      
      setModalConfig({
        isOpen: true,
        title: '¡Foto Actualizada!',
        message: 'Tu foto de perfil se ha guardado correctamente.',
        theme: 'green',
      })
    } catch (e) {
      console.error(e)
      setError('Error al recortar/guardar la imagen: ' + (e.message || ''))
      setIsCropModalOpen(false)
    } finally {
      setCargando(false)
    }
  }

  const cancelarCrop = () => {
    setIsCropModalOpen(false)
    setTempImage(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (nuevaContrasena && nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden')
      return
    }

    setCargando(true)
    try {
      let updatedUser
      if (fotoPerfilFile) {
        const formData = new FormData()
        formData.append('nombre', nombre)
        formData.append('correo', correo)
        formData.append('foto_perfil', fotoPerfilFile)
        if (nuevaContrasena) {
          formData.append('contrasena_actual', contrasenaActual)
          formData.append('nueva_contrasena', nuevaContrasena)
        }
        updatedUser = await updatePerfil(formData)
      } else {
        const data = { nombre, correo }
        if (nuevaContrasena) {
          data.contrasena_actual = contrasenaActual
          data.nueva_contrasena = nuevaContrasena
        }
        updatedUser = await updatePerfil(data)
      }

      loginUsuario({ usuario: updatedUser })
      
      setModalConfig({
        isOpen: true,
        title: '¡Perfil Actualizado!',
        message: 'Tu información personal se ha guardado correctamente.',
        theme: 'green',
      })

      setContrasenaActual('')
      setNuevaContrasena('')
      setConfirmarContrasena('')
      setFotoPerfilFile(null)
    } catch (err) {
      setModalConfig({
        isOpen: true,
        title: 'Error',
        message: err.message,
        theme: 'red',
      })
    } finally {
      setCargando(false)
    }
  }

  const rolLabels = {
    cliente: '🏃 Cliente',
    dueno: '🏢 Dueño de Cancha',
    admin: '🛡️ Administrador',
  }

  return (
    <>
      <Topbar />
      <div className="page">
        <Breadcrumb items={[
          { label: 'Inicio', href: `/dashboard/${usuario?.rol || 'cliente'}` },
          { label: 'Mi Perfil', active: true },
        ]} />
        <div className="page-header">
          <h1>👤 Mi Perfil</h1>
          <p>Edita tu información personal</p>
        </div>

        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div className="card mb-3 animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ position: 'relative', width: 80, height: 80 }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: 'var(--gradient-button)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: 'white',
                  overflow: 'hidden',
                  border: '2px solid var(--accent-green)',
                  boxShadow: 'var(--shadow-glow)',
                }}>
                  {fotoPerfilPreview ? (
                    <img
                      src={fotoPerfilPreview}
                      alt="Previsualización"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    usuario?.nombre?.charAt(0)?.toUpperCase()
                  )}
                </div>
                <label
                  htmlFor="avatar-input"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: 'rgba(22, 26, 34, 0.95)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    backdropFilter: 'blur(5px)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'all 0.2s',
                  }}
                  title="Cambiar foto de perfil"
                  className="avatar-edit-badge"
                >
                  📷
                  <input
                    type="file"
                    id="avatar-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFotoChange}
                  />
                </label>
              </div>
              <div>
                <h2 style={{ margin: 0 }}>{usuario?.nombre}</h2>
                <span className="badge badge-confirmada" style={{ marginTop: 4, display: 'inline-block' }}>
                  {rolLabels[usuario?.rol]}
                </span>
              </div>
            </div>

            {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input
                  className="form-input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Correo</label>
                <input
                  type="email"
                  className="form-input"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>

              <div style={{
                borderTop: '1px solid var(--border-subtle)',
                margin: '24px 0 16px',
                paddingTop: 16,
              }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: 16 }}>🔒 Cambiar Contraseña</h3>
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña actual</label>
                <input
                  type="password"
                  className="form-input"
                  value={contrasenaActual}
                  onChange={(e) => setContrasenaActual(e.target.value)}
                  placeholder="Solo si deseas cambiarla"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input
                    type="password"
                    className="form-input"
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    placeholder="Min. 6 caracteres"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    placeholder="Repetir contraseña"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={cargando} style={{ marginTop: 16 }}>
                {cargando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>

          {/* Zona de Peligro */}
          <div className="card animate-fade-in" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.02)', marginTop: 24 }}>
            <h3 style={{ color: '#ef4444', fontSize: '1rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠️ Zona de Peligro
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16, lineHeight: '1.4' }}>
              Al eliminar tu cuenta, se borrarán permanentemente tu perfil y todos tus datos (incluyendo complejos, canchas, reservas, reseñas, amistades y favoritos). Esta acción no se puede deshacer.
            </p>
            <button 
              type="button" 
              className="btn btn-block" 
              style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Eliminar Cuenta Permanentemente
            </button>
          </div>
        </div>
      </div>

      <CustomAlertModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        theme={modalConfig.theme}
        onConfirm={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />

      <CustomAlertModal
        isOpen={confirmDeleteOpen}
        title="¿Eliminar tu cuenta permanentemente?"
        message="Esta acción borrará irrevocablemente tu perfil y todos tus registros (locales, canchas, reservas, valoraciones y amistades). ¿Estás completamente seguro?"
        type="confirm"
        theme="red"
        confirmText="Sí, eliminar cuenta"
        cancelText="Cancelar"
        onConfirm={handleEliminarCuenta}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {isCropModalOpen && tempImage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(5px)'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '500px', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-light)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-pure)' }}>Ajustar foto de perfil</h3>
              <button onClick={cancelarCrop} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background='none'}>&times;</button>
            </div>
            
            <div style={{ position: 'relative', width: '100%', height: '350px', background: '#111' }}>
              <Cropper
                image={tempImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                objectFit="contain"
              />
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Zoom</span>
                <input 
                  type="range" 
                  min={1} 
                  max={3} 
                  step={0.1} 
                  value={zoom} 
                  onChange={(e) => setZoom(e.target.value)} 
                  style={{ flex: 1, accentColor: 'var(--accent-green)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={cancelarCrop}>Cancelar</button>
                <button className="btn-neon" onClick={guardarCrop}>Aplicar foto</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
