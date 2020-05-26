import {testSocks5} from '../src/BackendTester';

testSocks5('127.0.0.1', 25666)
  .then(T => {
    console.log(T);
  }).catch(E => {
  console.error(E);
});
