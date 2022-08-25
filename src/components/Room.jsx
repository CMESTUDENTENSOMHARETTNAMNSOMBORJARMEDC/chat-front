import { useRef, useState, useEffect, useContext } from 'react'
import { Subject, catchError, timer } from 'rxjs'
import { filter, first, timeout, map, takeUntil } from 'rxjs/operators'
import { ConnectionContext } from '../context/connection'

import User from './User'

const killSignal = new Subject()

export default function Room({ id, name, privateRoom, recipient, password }) {
  const { socket, listen, emit, focus } = useContext(ConnectionContext)

  const [joinObs, setJoinObs] = useState(null)
  const [leaveObs, setLeaveObs] = useState(null)

  const [unseenMessages, setUnseenMessages] = useState(0)
  const [users, setUsers] = useState([])
  const [joined, setJoined] = useState(false)
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')
  const [wrongPass, setWrongPass] = useState(false)
  const [passwordToSend, setPasswordToSend] = useState('')
  const [enterPassword, setEnterPassword] = useState({ enter: false })
  const [deleteHover, setDeleteHover] = useState(false)
  const [initedListeners, setInitedListeners] = useState(false)

  const focusedRef = useRef()
  focusedRef.current = focused
  const joinedRef = useRef()
  joinedRef.current = joined
  const passwordRef = useRef()
  passwordRef.current = passwordToSend

  useEffect(() => {
    if (joinObs === null) {
      setJoinObs(new Subject())
      setLeaveObs(new Subject())

      if (privateRoom) {
        const joinedPrivateListener = focus
          .pipe(
            filter((e) => e[0] === 'private message'),
            map((e) => e[1]),
            filter((data) => data.user_id === id),
            takeUntil(killSignal)
          )
          .subscribe((data) => {
            setJoined(true)
            handleMessage(data)
          })

        listen('user connected', killSignal)
          .pipe(filter((data) => data.user.id === id))
          .subscribe((data) => {
            handleUserJoin(data)
          })

        listen('user disconnected', killSignal)
          .pipe(filter((data) => data.id === id))
          .subscribe((data) => {
            //fixa detta
            handleUserLeave({ sid: data.id, id: data.sid })
          })
      }
      if (password) {
      }

      const joinedPrivateListener = focus
        .pipe(
          filter((e) => e[0] === 'join'),
          map((e) => e[1]),
          filter((data) => data === id),
          takeUntil(killSignal)
        )
        .subscribe((id) => {
          handleJoin()
        })

      listen('joined room', killSignal)
        .pipe(filter((room) => room === id))
        .subscribe((data) =>
          focus.next([
            'message',
            {
              id: '-2',
              message: `succesfully joined room ${data}`,
              username: '',
              created_at: Date(),
            },
          ])
        )

      listen('other left room', killSignal)
        .pipe(filter((data) => data.room === id))
        .subscribe((data) => handleUserLeave(data))

      listen('other joined room', killSignal)
        .pipe(filter((data) => data.room === id))
        .subscribe((data) => handleUserJoin(data))

      listen('left room', killSignal)
        .pipe(filter((data) => data === id))
        .subscribe(() => handleLeave())

      listen('message', killSignal)
        .pipe(filter((msg) => msg.recipient === id))
        .subscribe((data) => handleMessage(data))

      listen('users room', killSignal)
        .pipe(filter((data) => data.room === id))
        .subscribe((data) => {
          setUsers(data.users)
        })

      listen('delete room', killSignal)
        .pipe(filter((rid) => rid === id))
        .subscribe(() => {
          console.log('handle leave in ' + id)
          handleLeave()
        })

      listen('users private room', killSignal)
        .pipe(filter((data) => data.room === recipient))
        .subscribe((data) => {
          setUsers(data.users)
        })
    } else {
      joinObs.pipe(takeUntil(killSignal)).subscribe((x) => {
        joinedRef.current
          ? handleJoin()
          : password
          ? setEnterPassword({ enter: true, cb: handleJoin })
          : handleJoin()
      })
      leaveObs.subscribe((x) => socket.emit('leave room', id))
    }

    return () => {
      if (joinObs) {
        console.log('killing room  ' + id)
        // killSignal.next(true)
      }
    }
  }, [joinObs])
  useEffect(() => {})

  useEffect(() => {
    if (!initedListeners) {
      setInitedListeners(true)
    }

    if (focused) {
      setEnterPassword({ enter: false })
      setUnseenMessages(0)
      focus
        .pipe(
          filter((e) => e[0] === 'focus'),
          filter((e) => e[1].id !== id),
          first(),
          takeUntil(killSignal)
        )
        .subscribe(() => {
          console.log('unfocusing and closing sub')
          setFocused(false)
        })
      if (privateRoom) {
        socket.emit('fetch private room', {
          from: socket.id,
          recipient: recipient,
        })
        socket.emit('fetch private users', { me: socket.id, other: recipient })
      } else {
        socket.emit('fetch room', id)
        socket.emit('fetch users', id)
      }
    }
  }, [focused, initedListeners])

  const handleJoin = () => {
    if (!joinedRef.current) {
      if (!privateRoom) {
        socket.emit('join room', { id, password: passwordRef.current })

        const joinListen = listen('joined room', killSignal)
          .pipe(
            filter((data) => data === id),
            first()
          )
          .subscribe(() => {
            setJoined(true)
            setFocused(true)
            focus.next(['focus', { id, privateRoom, recipient }])
            failJoinListen.unsubscribe()
          })

        const failJoinListen = listen('wrong password', killSignal)
          .pipe(first())
          .subscribe(() => {
            setWrongPass(true)
            timer(2000).subscribe(() => setWrongPass(false))
            joinListen.unsubscribe()
          })
      } else {
        setJoined(true)
        setFocused(true)
        focus.next(['focus', { id, privateRoom, recipient }])
      }
    } else if (!focusedRef.current) {
      focus.next(['focus', { id, privateRoom, recipient }])
      setFocused(true)
    }
  }

  const handleLeave = () => {
    setJoined(false)
    focus.next(['focus', -1])
  }

  const handleUserLeave = (user) => {
    setUsers((users) => users.filter((u) => u.sid !== user.id))
  }

  const handleUserJoin = ({ user }) => {
    setUsers((users) => [...users, user])
  }

  const handleDelete = () => {
    if (password) {
      setEnterPassword({
        enter: true,
        cb: () => {
          socket.emit('delete room', { id, password: passwordRef.current })
          listen('wrong password', killSignal)
            .pipe(
              first(),
              timeout(1000),
              catchError(() => console.log('not an error'))
            )
            .subscribe(() => {
              console.log('wrong pass')
              setWrongPass(true)
              timer(2000).subscribe(() => setWrongPass(false))
            })
        },
      })
    } else {
      socket.emit('delete room', { id, password: '' })
    }
  }

  const handleMessage = (msg) => {
    if (focusedRef.current) {
      focus.next(['message', msg])
    } else {
      setUnseenMessages((unseenMessages) => unseenMessages + 1)
    }
  }

  const handleKeyDown = (e) => {
    if (e.code === 'Enter') {
      enterPassword.cb()
      setPasswordToSend('')
    }
    if (e.code === 'Escape') {
      setEnterPassword({ enter: false })
      setPasswordToSend('')
    }
  }

  const passwordInput = (
    <input
      autoFocus
      onBlur={() => {
        setEnterPassword({ enter: false })
      }}
      value={passwordToSend}
      onChange={(e) => setPasswordToSend(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )

  return (
    <div>
      {enterPassword.enter && (
        <>
          {passwordInput}
          {wrongPass && <div className="error">Wrong password</div>}
        </>
      )}
      {!enterPassword.enter && (
        <>
          <div>
            {joined && !focused && unseenMessages > 0 && (
              <span className="unseenMessage"> ({unseenMessages})</span>
            )}
            <b
              className={
                (focused ? 'focused' : joined ? 'joined' : 'unJoined') +
                ' roomName'
              }
              onClick={() => !focused && joinObs.next(true)}
            >
              {focused && '➤'}
              {password && '*'}
              {name}
            </b>
            {joined && (
              <>
                &nbsp;-&nbsp;
                <a
                  className="leave"
                  cursor="pointer"
                  onClick={() => leaveObs.next(true)}
                >
                  leave
                </a>
              </>
            )}
            {!privateRoom && (
              <span>
                &nbsp;-&nbsp;
                <a
                  className={deleteHover && 'del'}
                  onMouseEnter={() => setDeleteHover(true)}
                  onMouseLeave={() => setDeleteHover(false)}
                  onClick={handleDelete}
                >
                  {deleteHover ? '[delete]' : '[X]'}
                </a>
              </span>
            )}
          </div>
          <ul className="usersList">
            {focused &&
              users.map((user) => {
                return (
                  <li key={user.id}>
                    <User
                      id={user.id}
                      sid={user.sid}
                      name={user.name}
                      room={id}
                    />
                  </li>
                )
              })}
          </ul>
        </>
      )}
    </div>
  )
}
