// Demo auth: `?role=admin` makes you an admin, which `isAdmin` in feature-flags.config.ts reads.
export default defineEventHandler((event) => {
  const { role } = getQuery(event)
  if (role) {
    event.context.user = { id: `demo-${role}`, role }
  }
})
