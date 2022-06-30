import '../App.css'
import { useRef, useState, useEffect, useContext } from 'react'
import { ConnectionContext } from '../context/connection'
import Room from './Room'
import { map, filter, takeUntil, Subject } from 'rxjs'

const killSignal = new Subject()

export default function RoomsList() {
  const { socket, socket$, listen, emit, focus } = useContext(ConnectionContext)
  const [rooms, setRooms] = useState([])
  const [delayedEvent, setDelayedEvent] = useState(null)
  const roomsRef = useRef()
  roomsRef.current = rooms

  useEffect(() => {
    if (socket$) {
      focus
        .pipe(
          filter((e) => e[0] === 'private room'),
          map((e) => e[1]),
          takeUntil(killSignal)
        )
        .subscribe((data) => {
          handlePrivateRoom(data)
        })

      listen('private message', killSignal).subscribe((data) => {
        handlePrivateMessage(data)
      })

      listen('new room', killSignal).subscribe(({ id, name, password }) => {
        addRoom(name, id, { password })
      })

      listen('all rooms', killSignal).subscribe(({ rooms }) => {
        setRooms(rooms)
      })

      listen('delete room', killSignal).subscribe((id) => {
        setRooms((rooms) => rooms.filter((r) => r.id !== id))
      })

      socket.emit('fetch rooms')
    }
    return () => {
        console.log('cleaned roomslist')
        killSignal.next(true)
    }
  }, [])

  useEffect(() => {
    if (delayedEvent) {
      focus.next(delayedEvent)
      setDelayedEvent(null)
    }
  }, [delayedEvent])

  const addRoom = (name, id, { privateRoom, recipient, password }) => {
    setRooms((rooms) => [
      ...rooms,
      {
        name,
        id,
        privateRoom: privateRoom || false,
        recipient: recipient || false,
        password: password || false,
      },
    ])
  }

  const findRoom = (id) => {
    return roomsRef.current.find((room) => id === room.id)
  }

  const handlePrivateMessage = (message) => {
    const foundRoom = findRoom(message.user_id)
    if (!foundRoom) {
      addRoom('@' + message.username, message.user_id, {
        privateRoom: true,
        recipient: message.sid,
      })
      setDelayedEvent(['private message', message])
    } else {
      focus.next(['private message', message])
    }
  }

  const handlePrivateRoom = ({ id, sid, name }) => {
    const foundRoom = findRoom(id)
    if (!foundRoom) {
      console.log('new private room with id. ' + id)
      addRoom('@' + name, id, { privateRoom: true, recipient: sid })
    }
    setDelayedEvent(['join', id])
  }

  return (
    <div>
      <ul className="roomsList">
        {rooms &&
          rooms.map((room) => {
            return (
              <li key={room.id} className="roomItem">
                <Room
                  id={room.id}
                  name={room.name}
                  privateRoom={room.privateRoom}
                  recipient={room.recipient || room.id}
                  password={room.password}
                />
              </li>
            )
          })}
      </ul>
    </div>
  )
}
