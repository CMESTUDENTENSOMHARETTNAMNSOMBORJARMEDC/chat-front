import './App.css'
import { useState, useEffect, useRef } from 'react'
import { fromEvent, Subject, first } from 'rxjs'
import { map, takeUntil } from 'rxjs/operators'
import { connect, ConnectionContext } from './context/connection'
const { socket, socket$ } = connect

import RoomsList from './components/RoomsList'
import Chat from './components/Chat'

// const { socket, socket$, connect$, listen, emit } = connect
let msg = new Subject()
let nameChanged = new Subject()
let newRoomObs = new Subject()
const killSignal = new Subject()

function App(props) {
  const [authed, setAuthed] = useState(false)
  const [reconnected, setReconnected] = useState(false)
  const [text, setText] = useState('')
  const [passwordToSend, setPasswordToSend] = useState('')
  const [closedConnection, setClosedConnection] = useState(false)
  const textRef = useRef()
  textRef.current = text
  const authedRef = useRef()
  authedRef.current = authed

  // const nameChanger = new (false)
  const [name, setName] = useState('')
  const [nameChange, setNameChange] = useState(false)
  const [roomNameChange, setRoomNameChange] = useState(false)

  // const h$ = of(handleMessage)
  // if(!msg) msg = new Subject()
  // const nameChanged = new Subject()

  useEffect(() => {
    if (closedConnection) {
      console.log('close listeners')
      setAuthed(false)
      setReconnected(false)
      setClosedConnection(false)
      setName('')
    }
    if (!socket.auth) {
      nameChanged.pipe(takeUntil(killSignal)).subscribe(() => {
        if (authedRef.current) {
          setName('')
          setAuthed(false)
          socket.disconnect('name change')
          socket.off()
          setReconnected(true)
        }
        socket.auth = { username: textRef.current }
        socket.connect()
        // setAuthed(true)
        // socket.emit('change name', data)
        //
        socket$
          .pipe(
            map((socket) => fromEvent(socket, 'connect')),
            first(),
            takeUntil(killSignal)
          )
          .subscribe(() => {
            console.log('connected')
            setAuthed(true)
            connect.setup()
          })
      })
    }

    if (authed) {
      setReconnected(false)

      //first(), take(1) ?
      // emit(of('ready')).subscribe(({ socket, data }) => {
      // })

      // emit(nameChanged).subscribe(({ socket, data }) => {
      // console.log('changing name')
      // socket.auth = { data }
      // socket.connect()
      // socket.emit('change name', data)
      // })

      connect.emit(nameChanged, killSignal).subscribe(({ socket, data }) => {
        socket.emit('change name', data)
      })

      connect.emit(msg, killSignal).subscribe(({ socket, data }) => {
        socket.emit('message', data)
      })

      connect.emit(newRoomObs, killSignal).subscribe(({ socket, data }) => {
        socket.emit('create room', data)
      })

      connect.listen('connect_error', killSignal).subscribe((error) => {
        console.log(error)
        setClosedConnection(true)
      })

      connect.listen('change name', killSignal).subscribe((name) => {
        setName(name)
        setNameChange(false)
        setText('')
      })

      socket.emit('ready')
    }
    return () => {
      socket.off()
      killSignal.next('cleaned main')
    }
  }, [authed, reconnected, closedConnection])

  const handleKeyPress = (e, event) => {
    if (e.code === 'Enter') {
      if (event === 'name') nameChanged.next(text)
      if (event === 'roomName' && text !== '') {
        newRoomObs.next({ name: text, password: passwordToSend })
        setRoomNameChange(false)
        setText('')
        setPasswordToSend('')
      }
    }
    if (e.code === 'Escape') {
      setRoomNameChange(false)
      setNameChange(false)
      setText('')
      setPasswordToSend('')
    }
  }

  const title = (
    <>
      <div>
        &nbsp;@@@@@@@&nbsp;&nbsp;@@@&nbsp;&nbsp;@@@&nbsp;&nbsp;&nbsp;@@@@@@&nbsp;&nbsp;&nbsp;@@@@@@@
      </div>
      <div>
        @@@@@@@@&nbsp;&nbsp;@@@&nbsp;&nbsp;@@@&nbsp;&nbsp;@@@@@@@@&nbsp;&nbsp;@@@@@@@
      </div>
      <div>
        !@@&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;@@!&nbsp;&nbsp;@@@&nbsp;&nbsp;@@!&nbsp;&nbsp;@@@&nbsp;&nbsp;&nbsp;&nbsp;@@!&nbsp;&nbsp;
      </div>
      <div>
        !@!&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;!@!&nbsp;&nbsp;@!@&nbsp;&nbsp;!@!&nbsp;&nbsp;@!@&nbsp;&nbsp;&nbsp;&nbsp;!@!&nbsp;&nbsp;
      </div>
      <div>
        !@!&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;@!@!@!@!&nbsp;&nbsp;@!@!@!@!&nbsp;&nbsp;&nbsp;&nbsp;@!!&nbsp;&nbsp;
      </div>
      <div>
        !!!&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;!!!@!!!!&nbsp;&nbsp;!!!@!!!!&nbsp;&nbsp;&nbsp;&nbsp;!!!&nbsp;&nbsp;
      </div>
      <div>
        :!!&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;!!:&nbsp;&nbsp;!!!&nbsp;&nbsp;!!:&nbsp;&nbsp;!!!&nbsp;&nbsp;&nbsp;&nbsp;!!:&nbsp;&nbsp;
      </div>
      <div>
        :!:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:!:&nbsp;&nbsp;!:!&nbsp;&nbsp;:!:&nbsp;&nbsp;!:!&nbsp;&nbsp;&nbsp;&nbsp;:!:&nbsp;&nbsp;
      </div>
      <div>
        &nbsp;:::&nbsp;:::&nbsp;&nbsp;::&nbsp;&nbsp;&nbsp;:::&nbsp;&nbsp;::&nbsp;&nbsp;&nbsp;:::&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;::&nbsp;&nbsp;
      </div>
      <div>
        &nbsp;::&nbsp;::&nbsp;:&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;:&nbsp;:&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;:&nbsp;:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;
      </div>
    </>
  )

  const nameInput = (
    <div>
      <input
        className="nameInput"
        autoFocus
        onKeyDown={(e) => handleKeyPress(e, 'name')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div>{'<press return to connect>'}</div>
    </div>
  )

  const newRoomInput = (
    <div className="roomInputContainer">
      <div className="roomNameInput">
        <div>name</div>
        <input
          autoFocus
          onKeyDown={(e) => handleKeyPress(e, 'roomName')}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div className="roomPassInput">
        <div>password</div>
        <input
          onKeyDown={(e) => handleKeyPress(e, 'roomName')}
          value={passwordToSend}
          onChange={(e) => setPasswordToSend(e.target.value)}
        />
      </div>
    </div>
  )

  return (
    <ConnectionContext.Provider value={connect}>
      <div className="App">
        <header className="App-header">
          <div className="title">{title}</div>
          <div className="nameChange" onClick={() => setNameChange(true)}>
            {nameChange ? nameInput : name || '<click to enter name>'}
          </div>
          {name && (
            <div>
              {roomNameChange ? (
                newRoomInput
              ) : (
                <button onClick={() => setRoomNameChange(true)}>
                  nytt rum
                </button>
              )}
              <div className="chatContainer">
                <RoomsList className="roomsList" />
                <Chat className="chat" />
              </div>
            </div>
          )}
        </header>
      </div>
    </ConnectionContext.Provider>
  )
}

export default App
