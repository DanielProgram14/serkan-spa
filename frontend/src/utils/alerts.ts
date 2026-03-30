import Swal from 'sweetalert2';

// Inyectar estilos globales para SweetAlert2 para solucionar problemas de z-index con modales de MUI (z-index 1300)
const injectZIndex = () => {
  if (typeof document !== 'undefined' && !document.getElementById('swal2-zindex-override')) {
    const style = document.createElement('style');
    style.id = 'swal2-zindex-override';
    style.innerHTML = `
      .swal2-container {
        z-index: 9999 !important; /* Material UI usa 1300, por lo que 9999 asegurará que quede encima */
      }
    `;
    document.head.appendChild(style);
  }
};
injectZIndex();

// Toast configuration for non-intrusive success messages
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});

// Helper for success toasts
export const showSuccess = (title: string, text: string = '') => {
  return Toast.fire({
    icon: 'success',
    title,
    text
  });
};

// Helper for error modals (requires more attention)
export const showError = (title: string, text: string = '') => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#ef4444', // red-500
    confirmButtonText: 'Entendido',
    customClass: {
      popup: 'rounded-xl',
    }
  });
};

// Helper for warning messages
export const showWarning = (title: string, text: string = '') => {
  return Swal.fire({
    icon: 'warning',
    title,
    text,
    confirmButtonColor: '#f59e0b', // amber-500
    confirmButtonText: 'Entendido',
    customClass: {
      popup: 'rounded-xl',
    }
  });
};

// Helper for confirmation dialogs
export const confirmAction = async (
  title: string, 
  text: string = '', 
  confirmText: string = 'Sí, continuar',
  cancelText: string = 'Cancelar'
) => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444', // red-500 as default destructive action
    cancelButtonColor: '#94a3b8',  // slate-400
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
    customClass: {
      popup: 'rounded-xl',
    }
  });
  return result.isConfirmed;
};
