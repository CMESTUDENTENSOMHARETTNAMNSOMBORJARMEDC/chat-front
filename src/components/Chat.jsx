import '../App.css'
import { useRef, useState, useEffect, useContext } from 'react'
import { ConnectionContext } from '../context/connection'
import { filter, map, Subject, throttleTime, takeUntil } from 'rxjs'

const killSignal = new Subject()

export default function Chat() {
  const { socket, listen, emit, focus } = useContext(ConnectionContext)

  const [id, setId] = useState(-1)
  const [recipient, setRecipient] = useState(-1)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [textObs, setTextObs] = useState(null)
  const [privateRoom, setPrivateRoom] = useState('')
  const idRef = useRef()
  idRef.current = id

  useEffect(() => {
    if (!textObs) {
      setTextObs(new Subject())
    } else {
      textObs.subscribe((text) => setText(text))
      textObs
        .pipe(throttleTime(3000), takeUntil(killSignal))
        .subscribe((text) => socket.emit('is writing', idRef.current))
    }
  }, [textObs])

  useEffect(() => {
    focus
      .pipe(
        filter((e) => e[0] === 'message'),
        map((e) => e[1]),
        takeUntil(killSignal)
      )
      .subscribe((data) => {
        addMessage(data)
      })

    focus
      .pipe(
        filter((e) => e[0] === 'focus'),
        map((e) => e[1]),
        takeUntil(killSignal)
      )
      .subscribe(({ id, recipient, privateRoom }) => {
        setId(id)
        setRecipient(recipient)
        setMessages([])
        setPrivateRoom(privateRoom)
      })

    listen('messages room', killSignal).subscribe((data) => {
      data.forEach((m) => addMessage(m))
    })
    return () => {
      console.log('cleaned chat')
      killSignal.next(true)
    }
  }, [])

  const addMessage = (message) => {
    setMessages((messages) => [message, ...messages])
  }

  const handleKeyPress = (e) => {
    if (e.code === 'Enter') {
      //todo: make observable
      socket.emit(privateRoom ? 'private message' : 'message', {
        message: text,
        recipient: recipient,
      })
      setText('')
    }
  }

  const delimiter = ': '

  return (
    <div className="chat">
      <ol className="messageList">
        {messages &&
          messages.map((msg) => (
            <li className="messageItem" key={msg.id}>
              <span className="nameInMessage">
                {' '}
                {msg.username}
                {delimiter}
              </span>
              <span className="message">{msg.message}</span>
              <span className="messageTime">
                {new Date(msg.created_at).toString().split(' ')[4]}
              </span>
            </li>
          ))}
      </ol>
      <div className="chatBox">
        {id !== -1 && (
          <input
            className="chatInput"
            autoFocus
            value={text}
            onChange={(e) => textObs.next(e.target.value)}
            onKeyPress={handleKeyPress}
          />
        )}
      </div>
    </div>
  )
}
