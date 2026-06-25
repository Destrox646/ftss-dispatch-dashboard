import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Hash, Users, ChevronDown, ChevronRight, Radio, X, Search, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { contacts } from '../data/contacts'
import { useChatMessages, sendMessage } from '../hooks/useFirestore'
import { useAuth } from '../contexts/AuthContext'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

const ftssContacts = contacts.filter(c => c.name.toUpperCase().startsWith('FTSS'))

const defaultChannels = [
  { id: 'general', name: 'General', type: 'channel' },
  { id: 'dispatch', name: 'Dispatch', type: 'channel' },
]

const ftssGroup = {
  id: 'ftss',
  name: 'FTSS',
  type: 'group',
  members: ftssContacts,
  memberCount: ftssContacts.length,
}

export default function Chat() {
  const { user } = useAuth()
  const { data: messages } = useChatMessages()
  const [input, setInput] = useState('')
  const [activeChannel, setActiveChannel] = useState('general')
  const [showMembers, setShowMembers] = useState(false)
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [groupsOpen, setGroupsOpen] = useState(true)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastSearch, setBroadcastSearch] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState(new Set(ftssContacts.map(c => c.id)))
  const [broadcastSent, setBroadcastSent] = useState(false)
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const channelMessages = useMemo(() =>
    messages.filter(m => m.channel === activeChannel),
    [messages, activeChannel]
  )

  const activeInfo = activeChannel === 'ftss'
    ? ftssGroup
    : defaultChannels.find(c => c.id === activeChannel) || defaultChannels[0]

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    await sendMessage({
      senderId: user.uid,
      senderName: user.email.split('@')[0],
      senderAvatar: user.email[0].toUpperCase() + user.email[1].toUpperCase(),
      text: input.trim(),
      channel: activeChannel,
    })
    setInput('')
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return format(date, 'h:mm a')
  }

  const getAvatarColor = (name) => {
    const colors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']
    return colors[(name || '').charCodeAt(0) % colors.length]
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
      {/* Channel sidebar */}
      <div style={{
        width: '240px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Messages</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          <button onClick={() => setChannelsOpen(o => !o)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
            padding: '6px 16px', background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
          }}>
            {channelsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Channels
          </button>
          {channelsOpen && defaultChannels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                padding: '8px 16px 8px 28px', background: activeChannel === ch.id ? 'var(--bg-tertiary)' : 'none',
                border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                borderLeft: activeChannel === ch.id ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <Hash size={16} style={{ color: activeChannel === ch.id ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{
                fontSize: '14px', fontWeight: activeChannel === ch.id ? 600 : 400,
                color: activeChannel === ch.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}>{ch.name}</span>
            </button>
          ))}

          <button onClick={() => setGroupsOpen(o => !o)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
            padding: '6px 16px', marginTop: '8px', background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
          }}>
            {groupsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Groups
          </button>
          {groupsOpen && (
            <button
              onClick={() => setActiveChannel('ftss')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                padding: '8px 16px 8px 28px', background: activeChannel === 'ftss' ? 'var(--bg-tertiary)' : 'none',
                border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                borderLeft: activeChannel === 'ftss' ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <Users size={16} style={{ color: activeChannel === 'ftss' ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: '14px', fontWeight: activeChannel === 'ftss' ? 600 : 400,
                  color: activeChannel === 'ftss' ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>FTSS</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ftssGroup.memberCount} members</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeInfo.type === 'group' ? <Users size={18} style={{ color: 'var(--accent)' }} /> : <Hash size={18} style={{ color: 'var(--accent)' }} />}
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{activeInfo.name}</span>
            {activeInfo.type === 'group' && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>({ftssGroup.memberCount} members)</span>
            )}
          </div>
          {activeInfo.type === 'group' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setBroadcastOpen(true); setBroadcastMsg(''); setBroadcastSent(false); setBroadcastSending(false); setBroadcastResult(null); setBroadcastSearch(''); setSelectedRecipients(new Set(ftssContacts.map(c => c.id))) }} className="btn btn-primary btn-sm">
                <Radio size={14} /> Mass Text
              </button>
              <button onClick={() => setShowMembers(m => !m)} className="btn btn-ghost btn-sm">
                <Users size={14} /> Members
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 32px' }}>
              {channelMessages.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  height: '100%', color: 'var(--text-muted)', gap: '8px',
                }}>
                  {activeInfo.type === 'group' ? <Users size={40} style={{ opacity: 0.3 }} /> : <Hash size={40} style={{ opacity: 0.3 }} />}
                  <p style={{ fontSize: '15px', fontWeight: 600 }}>No messages yet</p>
                  <p style={{ fontSize: '13px' }}>Start the conversation in #{activeInfo.name}</p>
                </div>
              )}
              {channelMessages.map((msg, i) => {
                const isMe = msg.senderId === user.uid
                const showAvatar = i === 0 || channelMessages[i - 1].senderId !== msg.senderId

                return (
                  <div key={msg.id} style={{
                    display: 'flex', gap: '12px',
                    marginTop: showAvatar ? '20px' : '4px',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                  }}>
                    {!isMe && showAvatar && (
                      <div className={`avatar ${getAvatarColor(msg.senderName)}`} style={{ width: '36px', height: '36px', fontSize: '11px', marginTop: '2px' }}>{msg.senderAvatar}</div>
                    )}
                    {!isMe && !showAvatar && <div style={{ width: '36px', flexShrink: 0 }} />}
                    <div style={{ maxWidth: '65%', minWidth: '80px' }}>
                      {showAvatar && !isMe && (
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', marginBottom: '4px', paddingLeft: '2px' }}>{msg.senderName}</div>
                      )}
                      {showAvatar && isMe && (
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', paddingRight: '2px', textAlign: 'right' }}>You</div>
                      )}
                      <div style={{
                        padding: '10px 14px', borderRadius: '12px', fontSize: '14px', lineHeight: '1.5',
                        background: isMe ? 'var(--accent)' : 'var(--bg-tertiary)',
                        color: isMe ? 'white' : 'var(--text-primary)',
                        borderBottomRightRadius: isMe && showAvatar ? '4px' : '12px',
                        borderBottomLeftRadius: !isMe && showAvatar ? '4px' : '12px',
                      }}>
                        {msg.text}
                      </div>
                      {showAvatar && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '2px', textAlign: isMe ? 'right' : 'left' }}>
                          {formatTime(msg.timestamp)}
                        </div>
                      )}
                    </div>
                    {isMe && showAvatar && (
                      <div className="avatar avatar-purple" style={{ width: '36px', height: '36px', fontSize: '11px', marginTop: '2px' }}>{msg.senderAvatar}</div>
                    )}
                    {isMe && !showAvatar && <div style={{ width: '36px', flexShrink: 0 }} />}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={{
              padding: '16px 32px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex', gap: '12px',
            }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message #${activeInfo.name}...`}
                style={{
                  flex: 1, padding: '12px 16px',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                  fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 20px' }}>
                <Send />
                Send
              </button>
            </form>
          </div>

          {showMembers && activeInfo.type === 'group' && (
            <div style={{
              width: '260px', borderLeft: '1px solid var(--border)',
              background: 'var(--bg-secondary)', overflowY: 'auto',
              flexShrink: 0,
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Members — {ftssGroup.memberCount}
                </h4>
              </div>
              {ftssGroup.members.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 16px', borderBottom: '1px solid var(--border)',
                }}>
                  <div className={`avatar ${getAvatarColor(m.name)}`} style={{
                    width: '28px', height: '28px', fontSize: '9px',
                  }}>
                    {(m.firstName[0] || '') + (m.lastName[0] || '')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                    {m.phones[0] && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{m.phones[0].number}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Modal */}
      {broadcastOpen && (
        <div className="modal-overlay" onClick={() => setBroadcastOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} style={{ color: 'var(--accent)' }} />
                Mass Text — FTSS
              </h3>
              <button className="modal-close" onClick={() => setBroadcastOpen(false)}><X size={20} /></button>
            </div>
            {!broadcastSent ? (
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!broadcastMsg.trim()) return
                setBroadcastSending(true)
                // Send in-app chat message
                await sendMessage({
                  senderId: user.uid,
                  senderName: user.email.split('@')[0],
                  senderAvatar: user.email[0].toUpperCase() + user.email[1].toUpperCase(),
                  text: broadcastMsg.trim(),
                  channel: 'ftss',
                  broadcast: true,
                  recipientCount: selectedRecipients.size,
                })
                // Send actual SMS via Cloud Function
                const selected = ftssContacts.filter(c => selectedRecipients.has(c.id))
                const smsRecipients = selected
                  .filter(c => c.phones && c.phones.length > 0)
                  .map(c => ({ name: c.name, phone: c.phones[0].number }))
                let smsResult = null
                if (smsRecipients.length > 0) {
                  try {
                    const sendMassText = httpsCallable(functions, 'sendMassText')
                    smsResult = (await sendMassText({ message: broadcastMsg.trim(), recipients: smsRecipients })).data
                  } catch (err) {
                    smsResult = { success: 0, failed: smsRecipients.length, errors: [{ error: err.message }] }
                  }
                }
                setBroadcastSending(false)
                setBroadcastSent(true)
                setBroadcastResult(smsResult)
              }}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Message</label>
                    <textarea
                      placeholder="Type your mass text message..."
                      value={broadcastMsg}
                      onChange={e => setBroadcastMsg(e.target.value)}
                      rows={4}
                      autoFocus
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Recipients ({selectedRecipients.size} of {ftssContacts.length})</label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedRecipients(new Set(ftssContacts.map(c => c.id)))}>Select All</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedRecipients(new Set())}>Deselect All</button>
                    </div>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        placeholder="Filter recipients..."
                        value={broadcastSearch}
                        onChange={e => setBroadcastSearch(e.target.value)}
                        style={{ paddingLeft: '32px', fontSize: '13px', padding: '8px 12px 8px 32px', width: '100%' }}
                      />
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      {ftssContacts.filter(c => {
                        if (!broadcastSearch.trim()) return true
                        const q = broadcastSearch.toLowerCase()
                        return c.name.toLowerCase().includes(q) || c.phones.some(p => p.number.includes(q))
                      }).map(c => {
                        const checked = selectedRecipients.has(c.id)
                        const initials = (c.firstName[0] || '') + (c.lastName[0] || '')
                        const colors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']
                        return (
                          <label key={c.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 12px', cursor: 'pointer',
                            borderBottom: '1px solid var(--border)',
                            background: checked ? 'rgba(59,130,246,0.06)' : 'transparent',
                            transition: 'background 0.1s',
                          }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedRecipients(prev => {
                                  const next = new Set(prev)
                                  if (next.has(c.id)) next.delete(c.id); else next.add(c.id)
                                  return next
                                })
                              }}
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            <div className={`avatar ${colors[c.name.charCodeAt(4) % colors.length]}`} style={{ width: '26px', height: '26px', fontSize: '9px', flexShrink: 0 }}>
                              {initials}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {c.name.replace(/^FTSS\s*/i, '')}
                              </div>
                            </div>
                            {c.phones[0] && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0 }}>{c.phones[0].number}</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setBroadcastOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!broadcastMsg.trim() || selectedRecipients.size === 0 || broadcastSending}>
                    {broadcastSending ? (
                      <><span className="spinner" /> Sending...</>
                    ) : (
                      <><Send size={14} /> Send to {selectedRecipients.size} contacts</>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="modal-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Mass Text Sent</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Message delivered to {selectedRecipients.size} FTSS contacts
                </p>
                {broadcastResult && (
                  <div style={{
                    background: broadcastResult.failed > 0 ? 'var(--red-light)' : 'var(--green-light)',
                    borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '24px', fontSize: '13px',
                  }}>
                    <p style={{ fontWeight: 600, marginBottom: '4px' }}>
                      SMS Results: {broadcastResult.success} sent, {broadcastResult.failed} failed
                    </p>
                    {broadcastResult.errors && broadcastResult.errors.length > 0 && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                        {broadcastResult.errors.map(e => e.error).slice(0, 3).join('; ')}
                      </p>
                    )}
                  </div>
                )}
                <button type="button" className="btn btn-primary" onClick={() => setBroadcastOpen(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
