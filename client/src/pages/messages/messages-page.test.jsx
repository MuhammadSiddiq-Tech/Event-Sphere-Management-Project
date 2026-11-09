/**
 * @fileoverview Unit tests for MessagesPage (T-7.10).
 * Architecture §6.2, FR-EXP-06, FR-EXP-07, FR-ATT-05.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import MessagesPage from './MessagesPage.jsx';
import * as ConversationsApi from '../../api/conversations.js';
import * as AuthContextModule from '../../context/AuthContext.jsx';
import * as SocketContextModule from '../../context/SocketContext.jsx';

vi.mock('../../api/conversations.js');

const mockCurrentUser = {
  id: 'u-current',
  name: 'Current User',
  email: 'current@test.com',
  role: 'attendee',
};

const mockConversations = [
  {
    id: 'conv-1',
    type: 'exhibitor-attendee',
    participants: [
      { id: 'u-current', name: 'Current User', role: 'attendee' },
      { id: 'u-exhibitor', name: 'Acme Robotics', role: 'exhibitor' },
    ],
    lastMessage: { text: 'See you at booth A-1!' },
    lastMessageAt: new Date().toISOString(),
    unreadCount: 2,
    expo: { title: 'Robotics Expo 2026' },
  },
];

const mockMessages = [
  {
    id: 'm-1',
    conversation: 'conv-1',
    sender: { id: 'u-exhibitor', name: 'Acme Robotics', role: 'exhibitor' },
    body: 'Hello! Thanks for reaching out.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm-2',
    conversation: 'conv-1',
    sender: { id: 'u-current', name: 'Current User', role: 'attendee' },
    body: 'See you at booth A-1!',
    createdAt: new Date().toISOString(),
  },
];

function renderMessagesPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MessagesPage />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe('T-7.10: MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockCurrentUser,
      isAuthenticated: true,
    });

    vi.spyOn(SocketContextModule, 'useConversationChat').mockReturnValue({
      isConnected: true,
      typingUsers: [],
      sendTyping: vi.fn(),
    });

    ConversationsApi.fetchConversations.mockResolvedValue({
      items: mockConversations,
      meta: { total: 1 },
    });

    ConversationsApi.fetchMessages.mockResolvedValue({
      items: mockMessages,
      meta: { total: 2 },
    });

    ConversationsApi.sendMessage.mockResolvedValue({
      id: 'm-3',
      conversation: 'conv-1',
      sender: mockCurrentUser,
      body: 'Can I test the robot?',
      createdAt: new Date().toISOString(),
    });

    ConversationsApi.markConversationRead.mockResolvedValue({ success: true });
  });

  it('renders conversations list and active conversation header', async () => {
    renderMessagesPage();

    expect(await screen.findByText('Messages')).toBeInTheDocument();
    expect(await screen.findByText('Acme Robotics')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Unread badge
  });

  it('renders message bubbles in the active conversation', async () => {
    renderMessagesPage();

    expect(await screen.findByText('Hello! Thanks for reaching out.')).toBeInTheDocument();
    expect(screen.getAllByText('See you at booth A-1!').length).toBeGreaterThanOrEqual(1);
  });

  it('sends a message when submitting composer input', async () => {
    renderMessagesPage();

    const input = await screen.findByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'Can I test the robot?' } });

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(ConversationsApi.sendMessage).toHaveBeenCalledWith('conv-1', {
        body: 'Can I test the robot?',
      });
    });
  });

  it('displays typing indicator when a user is typing', async () => {
    vi.spyOn(SocketContextModule, 'useConversationChat').mockReturnValue({
      isConnected: true,
      typingUsers: ['Acme Robotics'],
      sendTyping: vi.fn(),
    });

    renderMessagesPage();

    expect(await screen.findByText(/Acme Robotics is typing…/i)).toBeInTheDocument();
  });
});
