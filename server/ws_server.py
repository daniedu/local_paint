import asyncio
import json
import base64
from http import HTTPStatus
import os
import mimetypes

WEBSOCKET_PORT = 8001

rooms: dict[str, dict] = {}

async def handle_ws(reader, writer):
    """Minimal WebSocket server for multiplayer drawing."""
    # Read HTTP upgrade request
    data = await reader.read(4096)
    request = data.decode('utf-8', errors='replace')

    if 'Upgrade: websocket' not in request:
        writer.close()
        return

    # Extract room ID from path
    path_line = request.split('\n')[0]
    parts = path_line.split(' ')
    path = parts[1] if len(parts) > 1 else '/'
    room_id = path.replace('/ws/', '').strip('/') or 'default'

    if room_id not in rooms:
        rooms[room_id] = {
            'layers': [],
            'clients': [],
        }

    room = rooms[room_id]
    room['clients'].append(writer)
    print(f"Client joined room {room_id} ({len(room['clients'])} clients)")

    # Send accept handshake
    key = ''
    for line in request.split('\n'):
        if line.lower().startswith('sec-websocket-key:'):
            key = line.split(':')[1].strip()
            break

    import hashlib
    accept_key = base64.b64encode(
        hashlib.sha1((key + '258EAFA5-E914-47DA-95CA-5AB5E7518D4').encode()).digest()
    ).decode()

    response = (
        'HTTP/1.1 101 Switching Protocols\r\n'
        'Upgrade: websocket\r\n'
        'Connection: Upgrade\r\n'
        f'Sec-WebSocket-Accept: {accept_key}\r\n'
        'Access-Control-Allow-Origin: *\r\n'
        '\r\n'
    )
    writer.write(response.encode())
    await writer.drain()

    # Send state sync for existing layers
    state_msg = json.dumps({'type': 'state-sync', 'layers': room.get('layers', [])})
    await send_frame(writer, state_msg)

    try:
        while True:
            frame = await read_frame(reader)
            if frame is None:
                break
            try:
                msg = json.loads(frame)
                # Broadcast to all OTHER clients
                for client in room['clients'][:]:
                    if client is not writer:
                        try:
                            await send_frame(client, frame)
                        except:
                            room['clients'].remove(client)
            except json.JSONDecodeError:
                pass
    except (ConnectionResetError, asyncio.IncompleteReadError):
        pass
    finally:
        if writer in room['clients']:
            room['clients'].remove(writer)
        print(f"Client left room {room_id} ({len(room['clients'])} clients)")
        try:
            writer.close()
        except:
            pass


async def send_frame(writer, text: str):
    """Send a WebSocket text frame."""
    data = text.encode('utf-8')
    length = len(data)

    header = bytearray([0x81])  # FIN + text opcode
    if length < 126:
        header.append(length)
    elif length < 65536:
        header.extend([126, length >> 8, length & 0xFF])
    else:
        header.extend([127] + list(length.to_bytes(8, 'big')))

    writer.write(bytes(header) + data)
    await writer.drain()


async def read_frame(reader):
    """Read a WebSocket text frame."""
    first_byte = await reader.read(1)
    if not first_byte:
        return None

    opcode = first_byte[0] & 0x0F
    if opcode == 0x8:  # Close
        return None
    if opcode == 0x9:  # Ping
        # Send pong
        await send_frame(reader, writer=None)  # will need writer here
        return None
    if opcode != 0x1:  # Not a text frame
        return None

    second_byte = await reader.read(1)
    if not second_byte:
        return None

    masked = (second_byte[0] & 0x80) != 0
    length = second_byte[0] & 0x7F

    if length == 126:
        len_bytes = await reader.read(2)
        length = int.from_bytes(len_bytes, 'big')
    elif length == 127:
        len_bytes = await reader.read(8)
        length = int.from_bytes(len_bytes, 'big')

    if masked:
        mask_key = await reader.read(4)
        payload = await reader.read(length)
        payload = bytes(b ^ mask_key[i % 4] for i, b in enumerate(payload))
    else:
        payload = await reader.read(length)

    return payload.decode('utf-8', errors='replace')


async def main():
    server = await asyncio.start_server(handle_ws, '0.0.0.0', WEBSOCKET_PORT)
    print(f"WebSocket server running on ws://0.0.0.0:{WEBSOCKET_PORT}")
    async with server:
        await server.serve_forever()


if __name__ == '__main__':
    asyncio.run(main())
