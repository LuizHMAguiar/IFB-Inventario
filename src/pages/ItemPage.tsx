import { useEffect, useState } from 'react'
import VoiceForm from '../components/VoiceForm'
import { deserializeDbFromBase64 } from '../lib/db'

export default function ItemPage(){
  const [db, setDb] = useState<any|null>(null)
  const [room, setRoom] = useState<string|undefined>(undefined)

  useEffect(()=>{
    const loadDatabase = async () => {
      try {
        const b64 = sessionStorage.getItem('selected_base_b64')
        const selectedRoom = sessionStorage.getItem('selected_room')
        
        if (b64) {
          const database = await deserializeDbFromBase64(b64)
          setDb(database)
        }
        
        if (selectedRoom) {
          setRoom(selectedRoom)
        }
      } catch (err:any) {
        console.error('Erro ao carregar banco de dados:', err)
        alert('Erro ao carregar banco de dados: ' + (err.message || err))
      }
    }

    loadDatabase()
  }, [])

  return (
    <div className="container">
      <h1>Item — Sala: {room ?? '—'}</h1>
      <VoiceForm db={db} initialRoom={room} />
    </div>
  )
}
