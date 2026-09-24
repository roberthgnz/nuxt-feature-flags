export default defineEventHandler((event) => {
  const id = getHeader(event, 'x-user-id')
  if (id) {
    event.context.user = { id, role: getHeader(event, 'x-user-role') }
  }
})
