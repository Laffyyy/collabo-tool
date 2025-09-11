const fetch = require('node-fetch');

async function testMessageAPI() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMyNzQwNGNlLWQxZGQtNGE5My1hMTA4LWRmYTVhNDE1YTczNCIsInVzZXJuYW1lIjoidGVzdCIsImVtYWlsIjoidGVzdEBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MzcwNDI0ODIsImV4cCI6MTczNzA0NjA4Mn0.PmQWYLKOBYVKHp1rD7_lc1KhJW9WO-FfDLa_QJ6JNvI';
  
  try {
    console.log('Testing message API endpoint...');
    
    const testMessage = {
      dconversationId: 'test-conversation-id',
      dsenderId: '327404ce-d1dd-4a93-a108-dfa5a415a734',
      dcontent: 'Test message',
      dmessageType: 'text'
    };
    
    console.log('Sending test message:', testMessage);
    
    const response = await fetch('http://localhost:5000/api/chat/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);
    
    if (!response.ok) {
      console.error('API call failed');
    } else {
      console.log('API call successful');
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testMessageAPI();