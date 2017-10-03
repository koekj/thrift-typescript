import { fork, exec } from 'child_process'
import { generate } from '../../main/'

process.chdir(__dirname)

generate({
  rootDir: '.',
  outDir: 'codegen',
  sourceDir: 'thrift',
  files: [ './test_service/service.thrift' ]
})

const clientProc = fork('./client.ts')
const serverProc = fork('./server.ts')

function exit(code: number) {
  clientProc.kill()
  serverProc.kill()
  process.exit(code)
}

setTimeout(() => {
  exec('curl http://localhost:8044/ping', function(err, stout, sterr) {
    if (err != null) {
      console.error('Error running Thrift service: ', err)
      exit(1)
    }

    if (stout === 'status: 1') {
      exec('curl http://localhost:8044/peg', function(err, stout, sterr) {
        if (stout === 'peg complete') {
          console.log('Successfully able to run Thrift service')
          exit(0)
        } else {
          console.error(`Unexpected response from Thrift service: ${stout}`)
          exit(1)
        }
      })
    } else {
      console.error(`Unexpected response from Thrift service: ${stout}`)
      exit(1)
    }
  })
}, 5000)

setTimeout(() => {
  console.error(`Timeout while running integration tests`)
  exit(1)
}, 10000)