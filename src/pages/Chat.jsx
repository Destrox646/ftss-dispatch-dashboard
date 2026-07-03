import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Users, ChevronDown, ChevronRight, Radio, X, Search, CheckCircle, MessageCircle, Plus, Hash, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import { useChatMessages, sendMessage } from '../hooks/useFirestore'
import { useAuth } from '../contexts/AuthContext'
import { httpsCallable } from 'firebase/functions'
import { functions, db } from '../firebase'
import { useContactAvatars } from '../hooks/useContactAvatars'
import { useContacts } from '../hooks/useContacts'
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'

function Avatar({ name, initials, size = '36px', className, style }) {
  const { avatars } = useContactAvatars()
  const { ftssContacts } = useContacts()

  const contact = ftssContacts.find(c => c.name === name)
  const img = contact ? avatars[contact.id] : null
  const colors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple', 'avatar-red']
  const colorClass = colors[(name || '').charCodeAt(0) % colors.length]
  const s = { width: size, height: size, fontSize: `${Math.round(parseInt(size) * 0.3)}px`, flexShrink: 0, objectFit: 'cover', borderRadius: '50%', ...style }

  if (img) return <img src={img} alt="" className={`avatar ${className || ''}`} style={s} />
  return <div className={`avatar ${className || colorClass}`} style={s}>{initials}</div>
}

function ConfirmDialog({ title, message, count, onConfirm, onCancel }) {
  return (
    <div className="sms-confirm-overlay" onClick={onCancel}>
      <div className="sms-confirm-box" onClick={e => e.stopPropagation()}>
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="sms-confirm-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>
            <Send size={14} /> Send{count > 1 ? ` to ${count}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResultBanner({ result }) {
  if (!result) return null
  const hasFailure = result.failed > 0
  return (
    <div className={`sms-result ${hasFailure ? 'failure' : 'success'}`}>
      <p className="sms-result-title">SMS: {result.success} sent, {result.failed} failed</p>
      {result.errors?.length > 0 && (
        <p className="sms-result-errors">{result.errors.map(e => e.error).slice(0, 3).join('; ')}</p>
      )}
    </div>
  )
}

export default function Chat() {
  const { user } = useAuth()
  const { data: messages } = useChatMessages()
  const { ftssContacts } = useContacts()
  const currentUserId = user?.userId || user?.uid || user?.phone || 'user'
  const currentUserName = user?.name || user?.email?.split('@')[0] || user?.phone || 'User'
  const currentUserAvatar = currentUserName
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(p => p[0]?.toUpperCase()).join('') || 'U'

  const [input, setInput] = useState('')
  const [activeChannel, setActiveChannel] = useState('ftss')
  const [showMembers, setShowMembers] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState(true)
  const [customGroups, setCustomGroups] = useState([])

  // Group creation
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState(() => new Set())
  const [groupSearch, setGroupSearch] = useState('')

  // Quick Message
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickSearch, setQuickSearch] = useState('')
  const [quickRecipient, setQuickRecipient] = useState(null)
  const [quickMsg, setQuickMsg] = useState('')
  const [quickSending, setQuickSending] = useState(false)
  const [quickSent, setQuickSent] = useState(false)
  const [quickResult, setQuickResult] = useState(null)

  // Broadcast / Mass Text
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastSearch, setBroadcastSearch] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState(() => new Set())
  const [broadcastSent, setBroadcastSent] = useState(false)
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState(null)

  // SMS confirm
  const [smsConfirm, setSmsConfirm] = useState(null)

  const messagesEndRef = useRef(null)
  const ftssGroup = { id: 'ftss', name: 'FTSS', type: 'group', members: ftssContacts, memberCount: ftssContacts.length }

  // Listen for custom groups
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'chatGroups'), (snap) => {
      setCustomGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Default select all for broadcast
  useEffect(() => {
    setSelectedRecipients(new Set(ftssContacts.map(c => c.id)))
  }, [ftssContacts])

  // Top contacts by message frequency
  const topContacts = useMemo(() => {
    const counts = {}
    messages.forEach(m => {
      if (m.direct && m.senderId !== currentUserId) counts[m.senderId] = (counts[m.senderId] || 0) + 1
      if (m.direct && m.recipientId === currentUserId) counts[m.senderId] = (counts[m.senderId] || 0) + 1
      if (m.channel?.startsWith('direct-')) {
        const id = m.channel.replace('direct-', '')
        if (id !== currentUserId) counts[id] = (counts[id] || 0) + 1
      }
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => ftssContacts.find(c => c.id === id))
      .filter(Boolean)
  }, [messages, ftssContacts, currentUserId])

  const channelMessages = useMemo(() =>
    messages.filter(m => m.channel === activeChannel),
    [messages, activeChannel]
  )

  const activeGroup = activeChannel.startsWith('group-')
    ? customGroups.find(g => `group-${g.id}` === activeChannel)
    : null

  const activeInfo = activeChannel === 'ftss'
    ? ftssGroup
    : activeChannel === 'sms-incoming'
      ? { id: 'sms-incoming', name: 'SMS Inbox', type: 'direct' }
      : activeGroup
        ? { ...activeGroup, type: 'group' }
        : activeChannel.startsWith('direct-')
          ? {
              id: activeChannel,
              name: ftssContacts.find(c => `direct-${c.id}` === activeChannel)?.name || 'Contact',
              type: 'direct',
            }
          : ftssGroup

  const quickContacts = useMemo(() => {
    const q = quickSearch.trim().toLowerCase()
    const withPhones = ftssContacts.filter(c => c.phones?.length > 0)
    if (!q) return withPhones
    return withPhones.filter(c =>
      c.name.toLowerCase().includes(q) || c.phones.some(p => p.number.includes(q))
    )
  }, [ftssContacts, quickSearch])

  const formatTime = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return format(date, 'h:mm a')
  }

  // ── Handlers ──

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    await sendMessage({
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text: input.trim(),
      channel: activeChannel,
    })
    setInput('')
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!groupName.trim() || groupMembers.size === 0) return
    const members = ftssContacts.filter(c => groupMembers.has(c.id))
    await addDoc(collection(db, 'chatGroups'), {
      name: groupName.trim(),
      memberIds: members.map(c => c.id),
      members: members.map(c => ({ id: c.id, name: c.name, firstName: c.firstName, lastName: c.lastName, phones: c.phones || [] })),
      memberCount: members.length,
      createdBy: currentUserId,
      createdByName: currentUserName,
      createdAt: serverTimestamp(),
    })
    setGroupName('')
    setGroupMembers(new Set())
    setGroupSearch('')
    setCreateGroupOpen(false)
  }

  const handleDeleteGroup = async (groupId) => {
    await deleteDoc(doc(db, 'chatGroups', groupId))
    if (activeChannel === `group-${groupId}`) setActiveChannel('ftss')
  }

  const openQuickMessage = (contact = null) => {
    setQuickRecipient(contact)
    setQuickSearch(contact ? contact.name : '')
    setQuickMsg('')
    setQuickSending(false)
    setQuickSent(false)
    setQuickResult(null)
    setQuickOpen(true)
  }

  const doQuickSend = async () => {
    if (!quickMsg.trim() || !quickRecipient?.phones?.[0]) return
    setQuickSending(true)
    setSmsConfirm(null)

    const messageText = quickMsg.trim()

    // Store in-app message
    await sendMessage({
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text: messageText,
      channel: `direct-${quickRecipient.id}`,
      direct: true,
      recipientId: quickRecipient.id,
      recipientName: quickRecipient.name,
    })

    // Send SMS via Twilio
    try {
      const sendMassText = httpsCallable(functions, 'sendMassText')
      const result = (await sendMassText({
        message: messageText,
        recipients: [{ name: quickRecipient.name, phone: quickRecipient.phones[0].number, contactId: quickRecipient.id }],
      })).data
      setQuickResult(result)
    } catch (err) {
      setQuickResult({ success: 0, failed: 1, errors: [{ error: err.message }] })
    }

    setQuickSending(false)
    setQuickSent(true)
  }

  const handleQuickSend = (e) => {
    e.preventDefault()
    if (!quickMsg.trim() || !quickRecipient?.phones?.[0]) return
    // Show SMS confirmation before sending
    setSmsConfirm({
      title: 'Send SMS?',
      message: `This will send a text message to ${quickRecipient.name} (${quickRecipient.phones[0].number}). Each SMS costs money.`,
      count: 1,
      onConfirm: doQuickSend,
    })
  }

  const doBroadcastSend = async () => {
    if (!broadcastMsg.trim()) return
    setBroadcastSending(true)
    setSmsConfirm(null)
    const messageText = broadcastMsg.trim()

    // Store in-app message
    await sendMessage({
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text: messageText,
      channel: 'ftss',
      broadcast: true,
      recipientCount: selectedRecipients.size,
    })

    // Send SMS via Twilio
    const selected = ftssContacts.filter(c => selectedRecipients.has(c.id))
    const smsRecipients = selected
      .filter(c => c.phones?.length > 0)
      .map(c => ({ name: c.name, phone: c.phones[0].number, contactId: c.id }))

    let smsResult = null
    if (smsRecipients.length > 0) {
      try {
        const sendMassText = httpsCallable(functions, 'sendMassText')
        smsResult = (await sendMassText({ message: messageText, recipients: smsRecipients })).data
      } catch (err) {
        smsResult = { success: 0, failed: smsRecipients.length, errors: [{ error: err.message }] }
      }
    }

    setBroadcastSending(false)
    setBroadcastSent(true)
    setBroadcastResult(smsResult)
  }

  const handleBroadcastSend = (e) => {
    e.preventDefault()
    if (!broadcastMsg.trim() || selectedRecipients.size === 0) return
    const smsCount = ftssContacts.filter(c => selectedRecipients.has(c.id) && c.phones?.length > 0).length
    setSmsConfirm({
      title: 'Send Mass Text?',
      message: `This will send SMS to ${smsCount} contacts. Each text message costs money.`,
      count: smsCount,
      onConfirm: doBroadcastSend,
    })
  }

  // ── Render helpers ──

  const renderChannelBtn = (id, icon, name, sub) => {
    const isActive = activeChannel === id
    return (
      <button
        key={id}
        onClick={() => setActiveChannel(id)}
        className={`chat-channel-btn ${isActive ? 'active' : ''}`}
      >
        {icon}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
          <span className="channel-name">{name}</span>
          {sub && <span className="channel-sub">{sub}</span>}
        </div>
      </button>
    )
  }

  // ── JSX ──

  return (
    <div className="chat-layout">
      {/* ── Sidebar ── */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>Messages</h3>
          <div className="chat-sms-number">SMS: (762) 441-4999</div>
          <button onClick={() => openQuickMessage()} className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            <MessageCircle size={14} /> Quick Message
          </button>
        </div>

        <div className="chat-sidebar-scroll">
          {/* Recent Contacts */}
          <div className="chat-section-label">Recent Contacts</div>
          {topContacts.map(c => {
            const chId = `direct-${c.id}`
            const initials = (c.firstName?.[0] || '') + (c.lastName?.[0] || '') || c.name.slice(0, 2).toUpperCase()
            return (
              <button key={c.id} onClick={() => setActiveChannel(chId)} className={`chat-channel-btn ${activeChannel === chId ? 'active' : ''}`}>
                <Avatar name={c.name} initials={initials} size="24px" />
                <span className="channel-name">{c.name}</span>
              </button>
            )
          })}
          {topContacts.length === 0 && (
            <div style={{ padding: '8px 28px', fontSize: '12px', color: 'var(--text-muted)' }}>No recent contacts</div>
          )}

          {/* SMS Inbox */}
          {messages.some(m => m.channel === 'sms-incoming') && renderChannelBtn(
            'sms-incoming',
            <Inbox size={16} className="channel-icon" />,
            'SMS Inbox',
            'Incoming replies'
          )}

          {/* Groups */}
          <div className="chat-groups-header">
            <button onClick={() => setGroupsOpen(o => !o)} className="section-toggle">
              {groupsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Groups
            </button>
            <button onClick={() => { setCreateGroupOpen(true); setGroupName(''); setGroupMembers(new Set()); setGroupSearch('') }} className="add-group-btn" title="Create Group">
              <Plus size={14} />
            </button>
          </div>

          {groupsOpen && (
            <>
              {renderChannelBtn('ftss', <Users size={16} className="channel-icon" />, 'FTSS', `${ftssGroup.memberCount} members`)}
              {customGroups.map(g => {
                const chId = `group-${g.id}`
                return (
                  <div key={g.id} className="chat-group-row">
                    {renderChannelBtn(chId, <Hash size={16} className="channel-icon" />, g.name, `${g.memberCount} members`)}
                    <button onClick={() => handleDeleteGroup(g.id)} className="delete-group-btn" title="Delete group">
                      <X size={12} />
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-info">
            {activeInfo.type === 'group' ? <Users size={18} style={{ color: 'var(--accent)' }} /> : <MessageCircle size={18} style={{ color: 'var(--accent)' }} />}
            <span className="name">{activeInfo.name}</span>
            {activeInfo.type === 'group' && <span className="count">({ftssGroup.memberCount} members)</span>}
          </div>
          {activeInfo.type === 'group' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => {
                setBroadcastOpen(true); setBroadcastMsg(''); setBroadcastSent(false)
                setBroadcastSending(false); setBroadcastResult(null); setBroadcastSearch('')
                setSelectedRecipients(new Set(ftssContacts.map(c => c.id)))
              }} className="btn btn-primary btn-sm">
                <Radio size={14} /> Mass Text
              </button>
              <button onClick={() => setShowMembers(m => !m)} className="btn btn-ghost btn-sm">
                <Users size={14} /> Members
              </button>
            </div>
          )}
        </div>

        <div className="chat-body">
          <div className="chat-messages-col">
            <div className="chat-messages-area">
              {channelMessages.length === 0 && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">
                    {activeInfo.type === 'group' ? <Users size={32} /> : <MessageCircle size={32} />}
                  </div>
                  <p>No messages yet</p>
                  <p>Start the conversation in #{activeInfo.name}</p>
                </div>
              )}
              {channelMessages.map((msg, i) => {
                const isMe = msg.senderId === currentUserId
                const showAvatar = i === 0 || channelMessages[i - 1].senderId !== msg.senderId
                const initials = msg.senderAvatar || ''

                return (
                  <div key={msg.id} className={`chat-msg-row ${isMe ? 'me' : ''}`} style={{ marginTop: showAvatar ? '20px' : '4px' }}>
                    {!isMe && showAvatar && <Avatar name={msg.senderName} initials={initials} size="36px" style={{ marginTop: '2px' }} />}
                    {!isMe && !showAvatar && <div style={{ width: '36px', flexShrink: 0 }} />}
                    <div className="chat-msg-bubble">
                      {showAvatar && <div className="chat-msg-sender">{isMe ? 'You' : msg.senderName}</div>}
                      <div className={`chat-msg-text ${!isMe && showAvatar ? 'corner-tl' : ''} ${isMe && showAvatar ? 'corner-tr' : ''}`}>
                        {msg.text}
                      </div>
                      {showAvatar && <div className="chat-msg-time">{formatTime(msg.timestamp)}</div>}
                    </div>
                    {isMe && showAvatar && <Avatar name={msg.senderName} initials={initials} size="36px" className="avatar-purple" style={{ marginTop: '2px' }} />}
                    {isMe && !showAvatar && <div style={{ width: '36px', flexShrink: 0 }} />}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSend}>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Message #${activeInfo.name}...`}
              />
              <button type="submit" className="chat-send-btn" disabled={!input.trim()}>
                <Send size={18} />
              </button>
            </form>
          </div>

          {/* Members panel */}
          {showMembers && activeInfo.type === 'group' && (() => {
            const memberList = activeGroup ? (activeGroup.members || []) : ftssGroup.members
            const memberCount = activeGroup ? (activeGroup.memberCount || memberList.length) : ftssGroup.memberCount
            return (
              <div className="chat-members-panel">
                <div className="chat-members-header">
                  <h4>Members — {memberCount}</h4>
                </div>
                {memberList.map(m => {
                  const initials = (m.firstName?.[0] || '') + (m.lastName?.[0] || '')
                  return (
                    <div key={m.id} className="chat-member-row">
                      <Avatar name={m.name} initials={initials} size="28px" />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="chat-member-name">{m.name}</div>
                        {m.phones?.[0] && <div className="chat-member-phone">{m.phones[0].number}</div>}
                      </div>
                      {m.phones?.[0] && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => openQuickMessage(m)}>
                          <Send size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── Quick Message Modal ── */}
      {quickOpen && (
        <div className="modal-overlay" onClick={() => setQuickOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={18} style={{ color: 'var(--accent)' }} /> Quick Message
              </h3>
              <button className="modal-close" onClick={() => setQuickOpen(false)}><X size={20} /></button>
            </div>
            {!quickSent ? (
              <form onSubmit={handleQuickSend}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Send to anyone</label>
                    <div className="modal-search-wrap">
                      <Search size={14} />
                      <input
                        type="text"
                        placeholder="Search all contacts by name or phone..."
                        value={quickSearch}
                        onChange={e => { setQuickSearch(e.target.value); setQuickRecipient(null) }}
                        autoFocus
                      />
                    </div>
                    <div className="contact-selector">
                      {quickContacts.map(c => {
                        const selected = quickRecipient?.id === c.id
                        const initials = (c.firstName?.[0] || '') + (c.lastName?.[0] || '') || c.name.slice(0, 2).toUpperCase()
                        return (
                          <button type="button" key={c.id} onClick={() => { setQuickRecipient(c); setQuickSearch(c.name) }}
                            className={`contact-selector-item ${selected ? 'selected' : ''}`}>
                            <Avatar name={c.name} initials={initials} size="28px" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="name">{c.name}</div>
                              <div className="phone">{c.phones[0].number}</div>
                            </div>
                            {selected && <CheckCircle size={16} style={{ color: 'var(--accent)' }} />}
                          </button>
                        )
                      })}
                      {quickContacts.length === 0 && (
                        <div style={{ padding: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>No contacts found</div>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Message{quickRecipient ? ` to ${quickRecipient.name}` : ''}</label>
                    <textarea placeholder="Type your message..." value={quickMsg} onChange={e => setQuickMsg(e.target.value)} rows={4} style={{ resize: 'vertical' }} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setQuickOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!quickRecipient || !quickMsg.trim() || quickSending}>
                    {quickSending ? <><span className="spinner" /> Sending...</> : <><Send size={14} /> Send Message</>}
                  </button>
                </div>
              </form>
            ) : (
              <div className="modal-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Message Sent</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '12px' }}>Sent to {quickRecipient?.name}</p>
                <ResultBanner result={quickResult} />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => openQuickMessage()}>Send Another</button>
                  <button type="button" className="btn btn-primary" onClick={() => setQuickOpen(false)}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mass Text Modal ── */}
      {broadcastOpen && (
        <div className="modal-overlay" onClick={() => setBroadcastOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} style={{ color: 'var(--accent)' }} /> Mass Text — FTSS
              </h3>
              <button className="modal-close" onClick={() => setBroadcastOpen(false)}><X size={20} /></button>
            </div>
            {!broadcastSent ? (
              <form onSubmit={handleBroadcastSend}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Message</label>
                    <textarea placeholder="Type your mass text message..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} rows={4} autoFocus style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group">
                    <label>Recipients ({selectedRecipients.size} of {ftssContacts.length})</label>
                    <div className="broadcast-actions">
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedRecipients(new Set(ftssContacts.map(c => c.id)))}>Select All</button>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedRecipients(new Set())}>Deselect All</button>
                    </div>
                    <div className="modal-search-wrap">
                      <Search size={14} />
                      <input type="text" placeholder="Filter recipients..." value={broadcastSearch} onChange={e => setBroadcastSearch(e.target.value)} />
                    </div>
                    <div className="recipient-list">
                      {ftssContacts.filter(c => {
                        if (!broadcastSearch.trim()) return true
                        const q = broadcastSearch.toLowerCase()
                        return c.name.toLowerCase().includes(q) || c.phones.some(p => p.number.includes(q))
                      }).map(c => {
                        const checked = selectedRecipients.has(c.id)
                        const initials = (c.firstName[0] || '') + (c.lastName[0] || '')
                        return (
                          <label key={c.id} className={`recipient-row ${checked ? 'checked' : ''}`}>
                            <input type="checkbox" checked={checked}
                              onChange={() => setSelectedRecipients(prev => {
                                const next = new Set(prev)
                                if (next.has(c.id)) next.delete(c.id); else next.add(c.id)
                                return next
                              })}
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            <Avatar name={c.name} initials={initials} size="26px" />
                            <span className="recipient-name">{c.name.replace(/^FTSS\s*/i, '')}</span>
                            {c.phones[0] && <span className="recipient-phone">{c.phones[0].number}</span>}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setBroadcastOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={!broadcastMsg.trim() || selectedRecipients.size === 0 || broadcastSending}>
                    {broadcastSending ? <><span className="spinner" /> Sending...</> : <><Send size={14} /> Send to {selectedRecipients.size} contacts</>}
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
                <ResultBanner result={broadcastResult} />
                <button type="button" className="btn btn-primary" onClick={() => setBroadcastOpen(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create Group Modal ── */}
      {createGroupOpen && (
        <div className="modal-overlay" onClick={() => setCreateGroupOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} style={{ color: 'var(--accent)' }} /> Create Group Chat
              </h3>
              <button className="modal-close" onClick={() => setCreateGroupOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Group Name</label>
                  <input type="text" placeholder="e.g. Night Crew, Atlanta Routes..." value={groupName} onChange={e => setGroupName(e.target.value)} autoFocus />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Members ({groupMembers.size} selected)</label>
                  <div className="modal-search-wrap">
                    <Search size={14} />
                    <input type="text" placeholder="Search contacts..." value={groupSearch} onChange={e => setGroupSearch(e.target.value)} />
                  </div>
                  <div className="broadcast-actions">
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setGroupMembers(new Set(ftssContacts.map(c => c.id)))}>Select All</button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setGroupMembers(new Set())}>Deselect All</button>
                  </div>
                  <div className="recipient-list">
                    {ftssContacts.filter(c => {
                      if (!groupSearch.trim()) return true
                      const q = groupSearch.toLowerCase()
                      return c.name.toLowerCase().includes(q) || c.phones?.some(p => p.number.includes(q))
                    }).map(c => {
                      const checked = groupMembers.has(c.id)
                      const initials = (c.firstName?.[0] || '') + (c.lastName?.[0] || '')
                      return (
                        <label key={c.id} className={`recipient-row ${checked ? 'checked' : ''}`}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setGroupMembers(prev => {
                              const next = new Set(prev)
                              if (next.has(c.id)) next.delete(c.id); else next.add(c.id)
                              return next
                            })}
                            style={{ accentColor: 'var(--accent)' }}
                          />
                          <Avatar name={c.name} initials={initials} size="26px" />
                          <span className="recipient-name">{c.name.replace(/^FTSS\s*/i, '')}</span>
                          {c.phones?.[0] && <span className="recipient-phone">{c.phones[0].number}</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setCreateGroupOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!groupName.trim() || groupMembers.size === 0}>
                  <Plus size={14} /> Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SMS Confirm Dialog ── */}
      {smsConfirm && (
        <ConfirmDialog
          title={smsConfirm.title}
          message={smsConfirm.message}
          count={smsConfirm.count}
          onConfirm={smsConfirm.onConfirm}
          onCancel={() => setSmsConfirm(null)}
        />
      )}
    </div>
  )
}
