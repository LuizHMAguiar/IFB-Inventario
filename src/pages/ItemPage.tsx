import { useEffect, useState } from 'react'
import VoiceForm from '../components/VoiceForm'

export default function ItemPage(){
  const [db, setDb] = useState<string|null>(null)
  const [room, setRoom] = useState<string|undefined>(undefined)

  useEffect(()=>{
    const selectedBaseId = sessionStorage.getItem('selected_base_id')
    const selectedRoom = sessionStorage.getItem('selected_room')


    if (selectedBaseId) {
      setDb(selectedBaseId)
    }

    if (selectedRoom) {
      setRoom(selectedRoom)
    }
  },[])
        

  return (
    <div className="container">
      <h4>Base: {db ?? '—'}</h4>
      <h4>Sala: {room ?? '—'}</h4>
      <h1>Edição de Item:</h1>
      <VoiceForm db={db} initialRoom={room} />
    </div>
  )
}
