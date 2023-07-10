// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
import "../utils/LSVProxyRegistry.sol";
import "../actions/utils/helpers/ActionsUtilHelper.sol";
import "../utils/TokenUtils.sol";
import "../actions/aaveV3/helpers/AaveV3Helper.sol";
import "../actions/morpho/aaveV3/helpers/MorphoAaveV3Helper.sol";
import "../actions/compoundV3/helpers/CompV3Helper.sol";

struct Position {
    uint8 protocol;
    address proxy;
    address collateralToken;
    address debtToken;
    uint256 collateral;
    uint256 debt;
}

contract LSVView is ActionsUtilHelper, AaveV3Helper, MorphoAaveV3Helper, CompV3Helper {

    enum Protocol { AAVE_V3, MORPHO_AAVE_V3, COMPOUND_V3 }
    using TokenUtils for address;

    function getAllPositionForUser(address _user, address[] memory _collTokens) public view returns (Position[] memory positions){
        address[] memory proxies = LSVProxyRegistry(LSV_PROXY_REGISTRY_ADDRESS).getProxies(_user);
        positions = new Position[](proxies.length * _collTokens.length);
        uint256 positionCounter;

        for (uint i = 0; i < proxies.length; i++){
            // Aave position
            {   
                IPoolV3 lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);
                DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(TokenUtils.WETH_ADDR);
                for (uint j = 0; j < _collTokens.length; j++){
                    DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(_collTokens[j]);
                    if (reserveData.aTokenAddress != address(0)){
                        uint256 collBalance = reserveData.aTokenAddress.getBalance(_user);
                        if (collBalance > 0){
                            uint256 debtBalance = reserveData.variableDebtTokenAddress.getBalance(_user);
                            positions[positionCounter++] = Position(
                                uint8(Protocol.AAVE_V3),
                                _user,
                                _collTokens[j],
                                TokenUtils.WETH_ADDR,
                                collBalance,
                                debtBalance
                            );
                            j = _collTokens.length;
                        }
                    }
                }

            }
            // MorphoAave Position
            {
                address morphoAddr = getMorphoAddressByEmode(1);
                for (uint j = 0; j < _collTokens.length; j++){
                    uint256 collBalance = IMorphoAaveV3(morphoAddr).collateralBalance(_collTokens[j], _user);
                    if (collBalance > 0){
                        uint256 debtBalance = IMorphoAaveV3(morphoAddr).borrowBalance(TokenUtils.WETH_ADDR, _user);
                        positions[positionCounter++] = Position(
                            uint8(Protocol.MORPHO_AAVE_V3),
                            _user,
                            _collTokens[j],
                            TokenUtils.WETH_ADDR,
                            collBalance,
                            debtBalance
                        );
                        j = _collTokens.length; 
                    }
                }
            }
            // Compound V3 Position
            {
                IComet comet = IComet(COMP_ETH_COMET);
                for (uint j = 0; j < _collTokens.length; j++){
                    uint256 collBalance = comet.collateralBalanceOf(_user, _collTokens[j]);
                    if (collBalance > 0){
                        uint256 debtBalance = comet.borrowBalanceOf(_user);
                        positions[positionCounter++] = Position(
                            uint8(Protocol.COMPOUND_V3),
                            _user,
                            _collTokens[j],
                            TokenUtils.WETH_ADDR,
                            collBalance,
                            debtBalance
                        );
                        j = _collTokens.length; 
                    }
                }
            }
        }
    }
}