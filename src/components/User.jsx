import '../App.css'
import { useRef, useState, useEffect, useContext } from 'react'
import { ConnectionContext } from '../context/connection'
import { filter, Subject } from 'rxjs'

const killSignal = new Subject()

function User({ name, id, sid, room }) {
  const { socket, socket$, listen, emit, focus, setup, connect$ } =
    useContext(ConnectionContext)

  const [isWriting, setIsWriting] = useState(0)
  const [dots, setDots] = useState('')
  const [inited, setInited] = useState(false)
  const [status, setStatus] = useState('active')

  useEffect(() => {
    const statusListener = listen('is writing', killSignal)
      .pipe(filter((data) => data.id === sid && data.room === room))
      .subscribe((data) => {
        if (isWriting === 0) setDots('.')
        setIsWriting((isWriting) => isWriting + 1)
        setTimeout(() => {
          setIsWriting((isWriting) => isWriting - 1)
        }, 3500)
      })
  }, [])

  useEffect(() => {
    if (isWriting > 0) {
      setTimeout(() => {
        setDots((dots + '.').slice(0, (dots.length + 1) % 4))
      }, 700)
    }
  }, [dots])
  useEffect(() => {
    return () => {
      setInited(true)
      if (inited) {
        console.log('cleaned user')
        killSignal.next(true)
      }
    }
  }, [inited])

  return (
    <div
      className="user"
      onClick={() => focus.next(['private room', { id, sid, name }])}
    >
      {name}
      {isWriting > 0 && dots}
    </div>
  )
}

export default User
