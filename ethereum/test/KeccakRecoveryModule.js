const utils = require('@gnosis.pm/safe-contracts/test/utils')

const CreateAndAddModules = artifacts.require("./CreateAndAddModules.sol")
const GnosisSafe = artifacts.require("./GnosisSafe.sol")
const ProxyFactory = artifacts.require("./ProxyFactory.sol")
const KeccakRecoveryModule = artifacts.require("./KeccakRecoveryModule.sol")

contract('KeccakRecoveryModule', function(accounts) {

    let gnosisSafe
    let proxyFactory
    let createAndAddModules
    let moduleMasterCopy
    let lw

    const CALL = 0
    const DELEGATE = 1

    beforeEach(async function () {
        // Create lightwallet
        lw = await utils.createLightwallet()

        // Create Master Copies
        proxyFactory = await ProxyFactory.new()
        createAndAddModules = await CreateAndAddModules.new()
        let gnosisSafeMasterCopy = await GnosisSafe.new()
        moduleMasterCopy = await KeccakRecoveryModule.new()
        // Initialize safe master copy with accounts[0] and accounts[1] as owners and 2 required confirmations
        gnosisSafeMasterCopy.setup([accounts[0], accounts[1]], 2, 0, "0x")

        // Initialize safe proxy with lightwallet accounts as owners and also accounts[1], note that only lightwallet accounts can sign messages without prefix
        let gnosisSafeData = await gnosisSafeMasterCopy.contract.setup.getData([lw.accounts[0], lw.accounts[1], accounts[1]], 2, 0, "0x")
        gnosisSafe = utils.getParamFromTxEvent(
            await proxyFactory.createProxy(gnosisSafeMasterCopy.address, gnosisSafeData),
            'ProxyCreation', 'proxy', proxyFactory.address, GnosisSafe, 'create Gnosis Safe',
        )
    })

    let deployRecoveryModule = async function(recoveryHash, delay) {
        let moduleData = await moduleMasterCopy.contract.setup.getData(recoveryHash, delay)
        let proxyFactoryData = await proxyFactory.contract.createProxy.getData(moduleMasterCopy.address, moduleData)
        let modulesCreationData = utils.createAndAddModulesData([proxyFactoryData])
        let createAndAddModulesData = createAndAddModules.contract.createAndAddModules.getData(proxyFactory.address, modulesCreationData)

        let nonce = await gnosisSafe.nonce()
        let transactionHash = await gnosisSafe.getTransactionHash(createAndAddModules.address, 0, createAndAddModulesData, DELEGATE, 0, 0, 0, 0, 0, nonce)
        let sigs = utils.signTransaction(lw, [lw.accounts[0], lw.accounts[1]], transactionHash)
        utils.logGasUsage(
            'execTransaction enable module',
            await gnosisSafe.execTransaction(
                createAndAddModules.address, 0, createAndAddModulesData, DELEGATE, 0, 0, 0, 0, 0, sigs
            )
        )
    }

    it('execute recovery without delay', async () => {
        let hashData = "some random data for now"
        
        await deployRecoveryModule(web3.sha3(hashData), 0)

        let modules = await gnosisSafe.getModules()
        let recoveryModule = KeccakRecoveryModule.at(modules[0])
        assert.equal(await recoveryModule.manager.call(), gnosisSafe.address)

        utils.assertRejects(
            recoveryModule.executeRecovery(await gnosisSafe.SENTINEL_MODULES.call()),
            'executeRecovery cannot execute recovery without triggering'
        )

        utils.assertRejects(
            recoveryModule.triggerRecovery("YOUR MOM has your hash data", [lw.accounts[4], lw.accounts[5]]),
            'triggerRecovery invalid hashData'
        )

        await recoveryModule.triggerRecovery(hashData, [lw.accounts[4], lw.accounts[5]])
        assert.ok(await recoveryModule.recoveryStartTime.call() > 0)
        assert.equal(await recoveryModule.recoveryOwners.call(0), lw.accounts[4])
        assert.equal(await recoveryModule.recoveryOwners.call(1), lw.accounts[5])

        utils.assertRejects(
            recoveryModule.triggerRecovery(hashData, [lw.accounts[4], lw.accounts[5]]),
            'triggerRecovery cannot trigger multiple times'
        )

        let owners = await gnosisSafe.getOwners()
        await recoveryModule.executeRecovery(await gnosisSafe.SENTINEL_MODULES.call())
        assert.equal(await gnosisSafe.getThreshold(), 2)
        owners.unshift(lw.accounts[5], lw.accounts[4])
        assert.deepEqual(await gnosisSafe.getOwners(), owners)

        utils.assertRejects(
            recoveryModule.triggerRecovery(hashData, [lw.accounts[4], lw.accounts[5]]),
            'triggerRecovery cannot be used again'
        )
    })
});