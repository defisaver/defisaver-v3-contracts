// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../DS/DSProxyFactoryInterface.sol";
import "../DS/DSProxy.sol";
import "../utils/helpers/UtilHelper.sol";

contract PositionOwnerInfoView is UtilHelper{

    bytes32 constant safe100 = keccak256(hex'608060405273ffffffffffffffffffffffffffffffffffffffff600054163660008037600080366000845af43d6000803e6000811415603d573d6000fd5b3d6000f3fea165627a7a723058201e7d648b83cfac072cbccefc2ffc62a6999d4a050ee87a721942de1da9670db80029');
    bytes32 constant safe111 = keccak256(hex'608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea265627a7a72315820d8a00dc4fe6bf675a9d7416fc2d00bb3433362aa8186b750f76c4027269667ff64736f6c634300050e0032');
    bytes32 constant safe130 = keccak256(hex'608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea2646970667358221220d1429297349653a4918076d650332de1a1068c5f3e07c5c82360c277770b955264736f6c63430007060033');
    bytes32 constant safe141 = keccak256(hex'608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea264697066735822122003d1488ee65e08fa41e58e888a9865554c535f2c77126a82cb4c0f917f31441364736f6c63430007060033');
    
    function getInfoForAddress(address owner) public view returns(bool isEOA, bool isProxy, bool isSafe, bool isProxyOwnedBySafe){
        (bool isContract, bytes memory code) = isAddressContract(owner);
        if (!isContract) return (true, false, false, false);
        isProxy = DSProxyFactoryInterface(PROXY_FACTORY_ADDR).isProxy(owner);
        if (isProxy){
            isProxy = true;
            address proxyOwner = DSProxy(payable(owner)).owner();
            isProxyOwnedBySafe = isSafeWallet(proxyOwner.code);
        }
        isSafe = isSafeWallet(code);
    }
    function isAddressContract(address addr) private view returns (bool, bytes memory) {
        bytes memory code = addr.code;
        return (code.length > 0, code);
    }
    function isSafeWallet(bytes memory code) private pure returns (bool) {
        bytes32 keccakCode = keccak256(code);
        if ((keccakCode == safe100) || (keccakCode == safe111) || (keccakCode == safe130) || (keccakCode == safe141)) return true;
    }
}
