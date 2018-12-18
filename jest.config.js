//@flow

//$off
const {loadYamlSync} = require('./scripts/yaml-util')

const projects = addProjects(loadYamlSync('./jestproject.yml'))
module.exports = {
  projects,
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/store/epic.js',
    '!**/store/epic.js',
    '!**/DataStructures/**',
    '!**/graphite/tarjan/**',
    '!**/babel/**',
    '!**/fixtures/**',
  ],
}

function packageTest(displayName, opts = {}) {
  return Object.assign(
    {
      displayName,
      testMatch: [
        `<rootDir>/src/${displayName}/__tests__/**/*.(test|spec).js`,
        `<rootDir>/src/${displayName}/**/__tests__/**/*.(test|spec).js`,
      ],
      globals: {
        __DEV__: true,
      },
      // collectCoverage: true,
      automock: false,
      browser: false,
      testEnvironment: 'node',
      transform: {
        '^.+\\.jsx?$': 'babel-jest',
      },
      moduleNameMapper: {},
      testPathIgnorePatterns: ['<rootDir>/node_modules/'],
      transformIgnorePatterns: ['node_modules/(?!(bs-platform)/)'],
      roots: ['<rootDir>/src/'],
    },
    opts,
  )
}

function addProjects({tests, include}) {
  const projects = []
  for (const pkg of tests) {
    if (typeof pkg === 'string') {
      if (include[pkg]) projects.push(packageTest(pkg))
    } else {
      const [name, config] = pkg
      if (include[name]) {
        projects.push(packageTest(name, config))
      }
    }
  }
  return projects
}
