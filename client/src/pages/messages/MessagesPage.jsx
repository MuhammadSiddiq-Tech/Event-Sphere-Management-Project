/**
 * @fileoverview Two-Pane Responsive Messaging UI (T-7.10).
 * Architecture §6.2, FR-EXP-06, FR-EXP-07, FR-ATT-05.
 *
 * Supports:
 *  - Two-pane layout on desktop, stacked with back button on mobile.
 *  - Real-time chat via Socket.IO (useConversationChat hook).
 *  - Real-time typing indicators.
 *  - Auto-scroll to latest messages.
 *  - Unread count badges and automatic read marking.
 *  - Support conversation initiation dialog.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
  Spinner,
  Modal,
} from 'react-bootstrap';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext.jsx';
import { useConversationChat } from '../../context/SocketContext.jsx';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationRead,
  startConversation,
} from '../../api/conversations.js';
import { formatDistanceToNow, formatDateTime } from '../../lib/dateUtils.js';

export default function MessagesPage() {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active conversation selection
  const selectedFromUrl = searchParams.get('conversationId');
  const [selectedId, setSelectedId] = useState(selectedFromUrl || null);
  const [searchFilter, setSearchFilter] = useState('');
  const [messageText, setMessageText] = useState('');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');

  // Mobile view toggle: 'list' | 'chat'
  const [mobileView, setMobileView] = useState(selectedFromUrl ? 'chat' : 'list');

  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Load conversations
  const { data: convData, isLoading: convsLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchConversations({ limit: 50 }),
    refetchInterval: 30_000,
  });
  const conversations = convData?.items ?? [];

  // Sync selectedId with conversations list if not set
  useEffect(() => {
    if (!selectedId && conversations.length > 0 && !selectedFromUrl) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId, selectedFromUrl]);

  // Current active conversation object
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId),
    [conversations, selectedId]
  );

  // The other participant
  const otherParticipant = useMemo(() => {
    if (!activeConversation) return null;
    return activeConversation.participants?.find(
      (p) => (p.id || p._id) !== currentUserId
    );
  }, [activeConversation, currentUserId]);

  // Real-time chat hook for active conversation
  const { typingUsers, sendTyping } = useConversationChat(selectedId);

  // Load messages for active conversation
  const { data: msgData, isLoading: msgsLoading } = useQuery({
    queryKey: ['conversationMessages', selectedId],
    queryFn: () => fetchMessages(selectedId, { limit: 100 }),
    enabled: Boolean(selectedId),
  });
  const messages = msgData?.items ?? [];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers]);

  // Mark as read when active conversation changes or new messages arrive
  useEffect(() => {
    if (selectedId && activeConversation?.unreadCount > 0) {
      markConversationRead(selectedId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      });
    }
  }, [selectedId, activeConversation?.unreadCount, queryClient]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (body) => sendMessage(selectedId, { body }),
    onSuccess: () => {
      setMessageText('');
      sendTyping(false);
      queryClient.invalidateQueries({ queryKey: ['conversationMessages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = (e) => {
    e?.preventDefault();
    if (!messageText.trim() || sendMutation.isPending) return;
    sendMutation.mutate(messageText.trim());
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    sendTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const selectConversation = (id) => {
    setSelectedId(id);
    setSearchParams({ conversationId: id });
    setMobileView('chat');
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!searchFilter.trim()) return conversations;
    const q = searchFilter.toLowerCase();
    return conversations.filter((c) => {
      const other = c.participants?.find((p) => (p.id || p._id) !== currentUserId);
      return (
        other?.name?.toLowerCase().includes(q) ||
        other?.email?.toLowerCase().includes(q) ||
        c.expo?.title?.toLowerCase().includes(q) ||
        c.lastMessage?.text?.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchFilter, currentUserId]);

  // Start support conversation
  const supportMutation = useMutation({
    mutationFn: (initialMsg) =>
      startConversation({
        recipientId: 'admin', // backend finds admin or routes to support
        type: 'support',
        initialMessage: initialMsg,
      }),
    onSuccess: (newConv) => {
      setShowSupportModal(false);
      setSupportMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (newConv?.id) {
        selectConversation(newConv.id);
      }
    },
  });

  return (
    <Container fluid className="py-2 py-md-4 px-2 px-md-3" style={{ maxWidth: '1200px' }}>
      <Card className="shadow-sm border-0 overflow-hidden" style={{ height: 'calc(100vh - 140px)', minHeight: '520px' }}>
        <Row className="g-0 h-100">
          {/* Left Pane: Conversation List */}
          <Col
            md={5}
            lg={4}
            className={`border-end h-100 d-flex flex-column bg-white ${
              mobileView === 'chat' ? 'd-none d-md-flex' : 'd-flex'
            }`}
          >
            {/* Header with Search & Title */}
            <div className="p-3 border-bottom bg-light">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-chat-dots me-2 text-primary" />
                  Messages
                </h5>
              </div>
              <Form.Control
                type="search"
                size="sm"
                placeholder="Search conversations..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                aria-label="Search conversations"
              />
            </div>

            {/* List */}
            <div className="flex-grow-1 overflow-auto" role="list">
              {convsLoading && (
                <div className="text-center py-5 text-muted">
                  <Spinner size="sm" animation="border" className="me-2" />
                  Loading conversations…
                </div>
              )}

              {!convsLoading && filteredConversations.length === 0 && (
                <div className="text-center py-5 px-3 text-muted">
                  <i className="bi bi-chat-left-text fs-1 d-block mb-2 text-secondary" />
                  <p className="small mb-1 fw-semibold">No conversations found</p>
                  <p className="small text-muted mb-0">
                    Reach out to an exhibitor or organizer to start chatting.
                  </p>
                </div>
              )}

              {!convsLoading &&
                filteredConversations.map((conv) => {
                  const other = conv.participants?.find(
                    (p) => (p.id || p._id) !== currentUserId
                  );
                  const isSelected = conv.id === selectedId;

                  return (
                    <div
                      key={conv.id}
                      role="listitem"
                      tabIndex={0}
                      onClick={() => selectConversation(conv.id)}
                      onKeyDown={(e) => e.key === 'Enter' && selectConversation(conv.id)}
                      className={`d-flex align-items-start gap-2 p-3 border-bottom cursor-pointer ${
                        isSelected ? 'bg-primary bg-opacity-10' : 'hover-bg-light'
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Avatar */}
                      <div
                        className="rounded-circle bg-primary bg-opacity-25 text-primary fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '42px', height: '42px', fontSize: '1.1rem' }}
                      >
                        {other?.name ? other.name.charAt(0).toUpperCase() : '?'}
                      </div>

                      {/* Content */}
                      <div className="flex-grow-1 overflow-hidden">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-semibold text-truncate small text-dark">
                            {other?.name || 'User'}
                          </span>
                          <span className="text-muted small" style={{ fontSize: '0.7rem' }}>
                            {conv.lastMessageAt
                              ? formatDistanceToNow(new Date(conv.lastMessageAt))
                              : ''}
                          </span>
                        </div>

                        <div className="d-flex align-items-center gap-1 mb-1">
                          <Badge
                            bg={
                              other?.role === 'admin'
                                ? 'danger'
                                : other?.role === 'exhibitor'
                                ? 'success'
                                : 'info'
                            }
                            style={{ fontSize: '0.65rem' }}
                          >
                            {other?.role || 'user'}
                          </Badge>
                          {conv.expo?.title && (
                            <span className="text-muted text-truncate small" style={{ fontSize: '0.7rem' }}>
                              • {conv.expo.title}
                            </span>
                          )}
                        </div>

                        <p className="mb-0 text-secondary text-truncate small" style={{ fontSize: '0.8rem' }}>
                          {conv.lastMessage?.text || 'No messages yet'}
                        </p>
                      </div>

                      {/* Unread badge */}
                      {conv.unreadCount > 0 && (
                        <Badge pill bg="danger" className="align-self-center">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          </Col>

          {/* Right Pane: Chat Thread */}
          <Col
            md={7}
            lg={8}
            className={`h-100 d-flex flex-column bg-light ${
              mobileView === 'list' ? 'd-none d-md-flex' : 'd-flex'
            }`}
          >
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    {/* Mobile Back Button */}
                    <Button
                      variant="link"
                      size="sm"
                      className="d-md-none text-dark p-0 me-1"
                      onClick={() => setMobileView('list')}
                      aria-label="Back to conversations"
                    >
                      <i className="bi bi-arrow-left fs-5" />
                    </Button>

                    <div
                      className="rounded-circle bg-primary bg-opacity-25 text-primary fw-bold d-flex align-items-center justify-content-center"
                      style={{ width: '38px', height: '38px' }}
                    >
                      {otherParticipant?.name
                        ? otherParticipant.name.charAt(0).toUpperCase()
                        : '?'}
                    </div>

                    <div>
                      <h6 className="mb-0 fw-bold">{otherParticipant?.name || 'User'}</h6>
                      <div className="d-flex align-items-center gap-1">
                        <Badge
                          bg={
                            otherParticipant?.role === 'admin'
                              ? 'danger'
                              : otherParticipant?.role === 'exhibitor'
                              ? 'success'
                              : 'info'
                          }
                          style={{ fontSize: '0.65rem' }}
                        >
                          {otherParticipant?.role || 'user'}
                        </Badge>
                        {activeConversation.expo?.title && (
                          <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
                            • {activeConversation.expo.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-grow-1 p-3 overflow-auto" role="log" aria-live="polite">
                  {msgsLoading && (
                    <div className="text-center py-5 text-muted">
                      <Spinner size="sm" animation="border" className="me-2" />
                      Loading messages…
                    </div>
                  )}

                  {!msgsLoading && messages.length === 0 && (
                    <div className="text-center py-5 text-muted">
                      <p className="mb-0">No messages yet.</p>
                      <p className="small">Say hello to start the conversation!</p>
                    </div>
                  )}

                  {!msgsLoading &&
                    messages.map((msg) => {
                      const isMe =
                        (msg.sender?.id || msg.sender?._id || msg.sender) === currentUserId;

                      return (
                        <div
                          key={msg.id}
                          className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}
                        >
                          <div
                            className={`rounded-3 p-2 px-3 shadow-sm ${
                              isMe ? 'bg-primary text-white' : 'bg-white text-dark'
                            }`}
                            style={{ maxWidth: '75%', wordBreak: 'break-word' }}
                          >
                            {!isMe && (
                              <div className="fw-semibold text-primary small mb-1" style={{ fontSize: '0.75rem' }}>
                                {msg.sender?.name || 'User'}
                              </div>
                            )}
                            <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                              {msg.body}
                            </div>
                            <div
                              className={`text-end mt-1 ${isMe ? 'text-white-50' : 'text-muted'}`}
                              style={{ fontSize: '0.65rem' }}
                            >
                              {msg.createdAt
                                ? formatDateTime(msg.createdAt)
                                : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {/* Real-time Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <div className="d-flex align-items-center gap-2 text-muted small fst-italic mb-2">
                      <Spinner size="sm" animation="grow" style={{ width: '8px', height: '8px' }} />
                      <span>{typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing…</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Box */}
                <div className="p-3 bg-white border-top">
                  <Form onSubmit={handleSend} className="d-flex gap-2">
                    <Form.Control
                      type="text"
                      placeholder="Type a message..."
                      value={messageText}
                      onChange={handleInputChange}
                      disabled={sendMutation.isPending}
                      aria-label="Message text"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!messageText.trim() || sendMutation.isPending}
                      aria-label="Send message"
                    >
                      {sendMutation.isPending ? (
                        <Spinner size="sm" animation="border" />
                      ) : (
                        <i className="bi bi-send-fill" />
                      )}
                    </Button>
                  </Form>
                </div>
              </>
            ) : (
              <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted p-4">
                <i className="bi bi-chat-square-dots fs-1 mb-3 text-secondary" />
                <h5 className="fw-semibold">Select a conversation</h5>
                <p className="small text-muted text-center" style={{ maxWidth: '300px' }}>
                  Choose a conversation from the list to view message history and reply.
                </p>
              </div>
            )}
          </Col>
        </Row>
      </Card>
    </Container>
  );
}
