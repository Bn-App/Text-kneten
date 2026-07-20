interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <div id="toast" className={message ? 'show' : ''}>
      {message}
    </div>
  );
}
