const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== USUARIOS ===')
  const users = await prisma.user.findMany()
  console.log(users)
  
  console.log('\n=== PROVEEDORES API ===')
  const providers = await prisma.providerConfig.findMany()
  console.log(`Total de proveedores configurados: ${providers.length}`)
  providers.forEach(p => {
    console.log(`- ${p.provider} (${p.category}) - Activo: ${p.isActive}`)
  })
  
  console.log('\n=== LIBROS ===')
  const books = await prisma.book.findMany()
  console.log(`Total de libros: ${books.length}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
