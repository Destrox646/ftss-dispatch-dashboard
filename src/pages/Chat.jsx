import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Hash, Users, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { contacts } from '../data/contacts'

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

export default function Chat({ messages, setMessages, currentUser }) {
  const [input, setInput] = useState('')
  const [activeChannel, setActiveChannel] = useState('general')
  const [showMembers, setShowMembers] = useState(false)
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [groupsOpen, setGroupsOpen] = useState(true)
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

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMsg = {
      id: `m${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: input.trim(),
      timestamp: new Date(),
      channel: activeChannel,
    }

    setMessages(prev => [...prev, newMsg])
    setInput('')
  }

  const formatTime = (date) => format(date, 'h:mm a')

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
          {/* Channels section */}
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

          {/* Groups section */}
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
        {/* Channel header */}
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
            <button onClick={() => setShowMembers(m => !m)} className="btn btn-ghost btn-sm">
              <Users size={14} /> Members
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Messages */}
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
                const isMe = msg.senderId === currentUser.id
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

            {/* Input */}
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

          {/* Members panel */}
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
    </div>
  )
}
