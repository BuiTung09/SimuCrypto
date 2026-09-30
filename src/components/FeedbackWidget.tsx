import { useState } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    // Simulate backend call
    setIsSubmitted(true);
    setTimeout(() => {
      setIsOpen(false);
      setTimeout(() => {
        setIsSubmitted(false);
        setFeedback('');
      }, 300);
    }, 2000);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setIsOpen(true)}
            style={{ 
              position: 'fixed',
              bottom: '100px',
              right: '24px',
              width: '56px',
              height: '56px',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: '#559DD2',
              color: '#000',
              boxShadow: '0 4px 24px rgba(158,236,55,0.35)',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Gửi phản hồi"
          >
            <MessageSquarePlus size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            style={{
              position: 'fixed',
              right: '24px',
              bottom: '100px',
              zIndex: 60,
              width: '360px',
              maxWidth: 'calc(100vw - 48px)',
              padding: '24px',
              borderRadius: '20px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              boxShadow: '0 12px 48px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#559DD2', color: '#000' }}>
                  <MessageSquarePlus size={16} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>Gửi phản hồi</h3>
              </div>
              {!isSubmitted && (
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--foreground)',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {isSubmitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center' }}>
                <CheckCircle2 size={56} color="#559DD2" style={{ marginBottom: '16px' }} />
                <h4 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '8px', margin: 0 }}>Cảm ơn bạn!</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', margin: 0 }}>
                  Phản hồi của bạn đã được ghi nhận. Chúng tôi sẽ xem xét để cải thiện nền tảng.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Hãy cho chúng tôi biết bạn nghĩ gì về hệ thống, hoặc báo lỗi nếu có..."
                    rows={4}
                    style={{
                      width: '100%',
                      resize: 'none',
                      borderRadius: '12px',
                      padding: '16px',
                      fontSize: '0.875rem',
                      background: 'var(--background)',
                      border: '1px solid var(--border)',
                      color: 'var(--foreground)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#559DD2';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(158,236,55,0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={!feedback.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#559DD2',
                    color: '#000',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: !feedback.trim() ? 'not-allowed' : 'pointer',
                    opacity: !feedback.trim() ? 0.5 : 1,
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => { if (feedback.trim()) e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { if (feedback.trim()) e.currentTarget.style.opacity = '1'; }}
                >
                  <Send size={16} />
                  Gửi phản hồi
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
