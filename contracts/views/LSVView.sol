// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;
import { LSVProxyRegistry } from "../utils/LSVProxyRegistry.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
import { DFSProxyRegistry } from "../utils/DFSProxyRegistry.sol";

import { ActionsUtilHelper } from "../actions/utils/helpers/ActionsUtilHelper.sol";
import { AaveV3Helper } from "../actions/aaveV3/helpers/AaveV3Helper.sol";
import { MorphoAaveV3Helper } from "../actions/morpho/aaveV3/helpers/MorphoAaveV3Helper.sol";
import { CompV3Helper } from "../actions/compoundV3/helpers/CompV3Helper.sol";
import { MorphoBlueHelper } from "../actions/morpho-blue/helpers/MorphoBlueHelper.sol";
import { UtilHelper } from "../utils/helpers/UtilHelper.sol";
import { LSVUtilHelper } from "../actions/lsv/helpers/LSVUtilHelper.sol";
import { LSVProfitTracker } from "../utils/LSVProfitTracker.sol";
import { SparkHelper } from "../actions/spark/helpers/SparkHelper.sol";
import { IL2PoolV3 } from "../interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { IPoolV3 } from "../interfaces/aaveV3/IPoolV3.sol";
import { IPoolAddressesProvider } from "../interfaces/aaveV3/IPoolAddressesProvider.sol";
import { DataTypes } from "../interfaces/aaveV3/DataTypes.sol";
import { IMorphoAaveV3 } from "../interfaces/morpho/IMorphoAaveV3.sol";
import { IComet } from "../interfaces/compoundV3/IComet.sol";
import { MarketParams, Id } from "../interfaces/morpho-blue/IMorphoBlue.sol";
import { MarketParamsLib, MorphoLib, MorphoBalancesLib } from "../actions/morpho-blue/helpers/MorphoBlueLib.sol";

struct Position {
    uint8 protocol;
    address proxy;
    address collateralToken;
    address debtToken;
    uint256 collateral;
    uint256 debt;
}

contract LSVView is ActionsUtilHelper, UtilHelper, AaveV3Helper, MorphoAaveV3Helper, CompV3Helper, SparkHelper, MorphoBlueHelper, LSVUtilHelper {
    enum Protocol {
        AAVE_V3,
        MORPHO_AAVE_V3,
        COMPOUND_V3,
        SPARK,
        MORPHO_BLUE_WSTETH_MARKET_RATE,
        MORPHO_BLUE_WSTETH_LIDO_RATE_945,
        MORPHO_BLUE_WSTETH_LIDO_RATE_965,
        AAVE_V3_LIDO_INSTANCE,
        MORPHO_BLUE_WEETH_RATE_945,
        MORPHO_BLUE_WEETH_RATE_86,
        MORPHO_BLUE_EZETH_945,
        MORPHO_BLUE_EZETH_86
    }

    uint256 public constant NUMBER_OF_SUPPORTED_PROTOCOLS = 12;
    
    using TokenUtils for address;

    function getAllPositionForLSVUser(
        address _user,
        address[] memory _collTokens
    ) public view returns (address[] memory proxies, Position[] memory positions) {
        proxies = LSVProxyRegistry(LSV_PROXY_REGISTRY_ADDRESS).getProxies(_user);
        positions = _getPositions(_collTokens, proxies);
    }

    function getAllPositionForDFSUser(
        address _user,
        address[] memory _collTokens
    ) public view returns (address[] memory proxies, Position[] memory positions) {
        (address mcdProxy, address[] memory additionalProxies) = DFSProxyRegistry(
            DFS_PROXY_REGISTRY_ADDR
        ).getAllProxies(_user);

        if (mcdProxy == address(0)) {
            proxies = new address[](additionalProxies.length);
            for (uint256 i = 0; i < proxies.length; i++) {
                proxies[i] = additionalProxies[i];
            }
        } else {
            proxies = new address[](additionalProxies.length + 1);
            uint256 i;
            for (i; i < proxies.length - 1; i++) {
                proxies[i] = additionalProxies[i];
            }
            proxies[i] = mcdProxy;
        }
        positions = _getPositions(_collTokens, proxies);
    }

    function getAllPositionForEOA(
        address _user,
        address[] memory _collTokens
    ) public view returns (address[] memory proxies, Position[] memory positions) {
        address[] memory users = new address[](1);
        users[0] = _user;

        positions = _getPositions(_collTokens, users);

        for (uint256 i = 0; i < positions.length; i++) {
            proxies[i] = positions[i].proxy;
        }
    }

    function _getPositions(address[] memory _collTokens, address[] memory _users) internal view returns (Position[] memory positions) {
        Position[] memory tempPositions = new Position[](_users.length * NUMBER_OF_SUPPORTED_PROTOCOLS);
        uint256 positionCounter;

        for (uint256 i = 0; i < _users.length; i++) {
            positionCounter = _getAaveV3Positions(_collTokens, _users[i], tempPositions, positionCounter);
            positionCounter = _getMorphoAavePositions(_collTokens, _users[i], tempPositions, positionCounter);
            positionCounter = _getCompoundV3Positions(_collTokens, _users[i], tempPositions, positionCounter);
            positionCounter = _getSparkPositions(_collTokens, _users[i], tempPositions, positionCounter);
            positionCounter = _getMorphoBluePositions(_users[i], tempPositions, positionCounter);
            positionCounter = _getAaveLidoPositions(_collTokens, _users[i], tempPositions, positionCounter);
        }
        
        positions = new Position[](positionCounter);
        for (uint256 i = 0; i < positionCounter; i++) {
            positions[i] = tempPositions[i];
        }
    }

    function _getAaveV3Positions(
        address[] memory _collTokens,
        address _user,
        Position[] memory _positions,
        uint256 _counter
    ) internal view returns (uint256 counter) {
        counter = _counter;
        IPoolV3 lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);
        DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
            TokenUtils.WETH_ADDR
        );
        for (uint256 j = 0; j < _collTokens.length; j++) {
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                _collTokens[j]
            );
            if (reserveData.aTokenAddress != address(0)) {
                uint256 collBalance = reserveData.aTokenAddress.getBalance(_user);
                if (collBalance > 0) {
                    uint256 debtBalance = wethReserveData.variableDebtTokenAddress.getBalance(_user);
                    _positions[counter++] = Position(
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

    function _getMorphoAavePositions(
        address[] memory _collTokens,
        address _user,
        Position[] memory _positions,
        uint256 _counter
    ) internal view returns (uint256 counter) {
        counter = _counter;
        address morphoAddr = getMorphoAddressByEmode(1);
        for (uint256 j = 0; j < _collTokens.length; j++) {
            uint256 collBalance = IMorphoAaveV3(morphoAddr).collateralBalance(
                _collTokens[j],
                _user
            );
            if (collBalance > 0) {
                uint256 debtBalance = IMorphoAaveV3(morphoAddr).borrowBalance(
                    TokenUtils.WETH_ADDR,
                    _user
                );
                _positions[counter++] = Position(
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

    function _getCompoundV3Positions(
        address[] memory _collTokens,
        address _user,
        Position[] memory _positions,
        uint256 _counter
    ) internal view returns (uint256 counter) {
        counter = _counter;
        IComet comet = IComet(COMP_ETH_COMET);
        for (uint256 j = 0; j < _collTokens.length; j++) {
            uint256 collBalance = comet.collateralBalanceOf(_user, _collTokens[j]);
            if (collBalance > 0) {
                uint256 debtBalance = comet.borrowBalanceOf(_user);
                _positions[counter++] = Position(
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

    function _getMorphoBluePositions(address _user, Position[] memory _positions, uint256 _counter) internal view returns (uint256 counter) {
        counter = _counter;

        uint256 marketSize = 7;

        MarketParams[] memory markets = new MarketParams[](marketSize);
        markets[0] = _morphoBlueWstEthMarketRate();
        markets[1] = _morphoBlueWstEthLidoRate945();
        markets[2] = _morphoBlueWstEthLidoRate965();
        markets[3] = _morphoBlueWeEth945();
        markets[4] = _morphoBlueWeEth86();
        markets[5] = _morphoBlueEzEth945();
        markets[6] = _morphoBlueEzEth86();

        Protocol[] memory protocols = new Protocol[](marketSize);
        protocols[0] = Protocol.MORPHO_BLUE_WSTETH_MARKET_RATE;
        protocols[1] = Protocol.MORPHO_BLUE_WSTETH_LIDO_RATE_945;
        protocols[2] = Protocol.MORPHO_BLUE_WSTETH_LIDO_RATE_965;
        protocols[3] = Protocol.MORPHO_BLUE_WEETH_RATE_945;
        protocols[4] = Protocol.MORPHO_BLUE_WEETH_RATE_86;
        protocols[5] = Protocol.MORPHO_BLUE_EZETH_945;
        protocols[6] = Protocol.MORPHO_BLUE_EZETH_86;

        for (uint256 i = 0; i < marketSize; i++) {
            Position memory position = _getMorphoBlueWethPosition(markets[i], _user, protocols[i]);
            if (position.proxy != address(0)) _positions[counter++] = position;
        }
    }

    function _getMorphoBlueWethPosition(
        MarketParams memory _marketParams,
        address _user,
        Protocol _protocol
    ) internal view returns (Position memory position) {
        Id marketId = MarketParamsLib.id(_marketParams);
        if (MorphoLib.collateral(morphoBlue, marketId, _user) > 0){
            position = Position(
                uint8(_protocol),
                _user,
                _marketParams.collateralToken,
                TokenUtils.WETH_ADDR,
                MorphoLib.collateral(morphoBlue, marketId, _user),
                MorphoBalancesLib.expectedBorrowAssets(morphoBlue, _marketParams, _user)
            );
        }
    }

    function _getSparkPositions(
        address[] memory _collTokens,
        address _user,
        Position[] memory _positions,
        uint256 _counter
    ) internal view returns (uint256 counter) {
        counter = _counter;
        IPoolV3 lendingPool = getLendingPool(DEFAULT_SPARK_MARKET);
        DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
            TokenUtils.WETH_ADDR
        );
        for (uint256 j = 0; j < _collTokens.length; j++) {
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                _collTokens[j]
            );
            if (reserveData.aTokenAddress != address(0)) {
                uint256 collBalance = reserveData.aTokenAddress.getBalance(_user);
                if (collBalance > 0) {
                    uint256 debtBalance = wethReserveData.variableDebtTokenAddress.getBalance(_user);
                    _positions[counter++] = Position(
                        uint8(Protocol.SPARK),
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

    function _getAaveLidoPositions(
        address[] memory _collTokens,
        address _user, 
        Position[] memory _positions,
        uint256 _counter
    ) internal view returns (uint256 counter) {
        counter = _counter;
        IPoolV3 lendingPool = getLendingPool(0xcfBf336fe147D643B9Cb705648500e101504B16d);
        DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
            TokenUtils.WETH_ADDR
        );
        for (uint256 j = 0; j < _collTokens.length; j++) {
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                _collTokens[j]
            );
            if (reserveData.aTokenAddress != address(0)) {
                uint256 collBalance = reserveData.aTokenAddress.getBalance(_user);
                if (collBalance > 0) {
                    uint256 debtBalance = wethReserveData.variableDebtTokenAddress.getBalance(_user);
                    _positions[counter++] = Position(
                        uint8(Protocol.AAVE_V3_LIDO_INSTANCE),
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

    function getInfoForLSVPosition(uint8 _protocol, address _lsvProxy, address[] memory _collTokens) public view returns (uint256 netWorth, int256 unrealisedProfit) {
        unrealisedProfit = LSVProfitTracker(LSV_PROFIT_TRACKER_ADDRESS).unrealisedProfit(_protocol, _lsvProxy);
        (uint256 collBalance, uint256 ethDebtBalance, address collToken) = findCollAndDebtBalance(_protocol, _lsvProxy, _collTokens);
        uint256 collBalanceInETH = getAmountInETHFromLST(collToken, collBalance);
        if (collBalanceInETH >= ethDebtBalance){
            netWorth = collBalanceInETH  - ethDebtBalance;
        } else {
            return (0,0);
        }
    }
    
    function findCollAndDebtBalance(uint8 protocol, address _user, address[] memory _collTokens) public view returns (uint256, uint256, address){
        if (protocol == uint8(Protocol.AAVE_V3)) return findCollAndDebtForAaveV3Position(_user, _collTokens);
        if (protocol == uint8(Protocol.MORPHO_AAVE_V3)) return findCollAndDebtForMorphoAaveV3Position(_user, _collTokens);
        if (protocol == uint8(Protocol.COMPOUND_V3)) return findCollAndDebtForCompV3Position(_user, _collTokens);
        if (protocol == uint8(Protocol.SPARK)) return findCollAndDebtForSparkPosition(_user, _collTokens);
        if (protocol == uint8(Protocol.MORPHO_BLUE_WSTETH_MARKET_RATE)) return findCollAndDebtForMorphoBlueWstethPosition(_user, Protocol(protocol));
        if (protocol == uint8(Protocol.MORPHO_BLUE_WSTETH_LIDO_RATE_945)) return findCollAndDebtForMorphoBlueWstethPosition(_user, Protocol(protocol));
        if (protocol == uint8(Protocol.MORPHO_BLUE_WSTETH_LIDO_RATE_965)) return findCollAndDebtForMorphoBlueWstethPosition(_user, Protocol(protocol));
        if (protocol == uint8(Protocol.AAVE_V3_LIDO_INSTANCE)) return findCollAndDebtForAaveV3LidoPosition(_user, _collTokens);
        if (protocol == uint8(Protocol.MORPHO_BLUE_WEETH_RATE_945)) return findCollAndDebtForMorphoBlueWstethPosition(_user, Protocol(protocol));
        if (protocol == uint8(Protocol.MORPHO_BLUE_WEETH_RATE_86)) return findCollAndDebtForMorphoBlueWstethPosition(_user, Protocol(protocol));
        if (protocol == uint8(Protocol.MORPHO_BLUE_EZETH_945)) return findCollAndDebtForMorphoBlueWstethPosition(_user, Protocol(protocol));
        if (protocol == uint8(Protocol.MORPHO_BLUE_EZETH_86)) return findCollAndDebtForMorphoBlueWstethPosition(_user, Protocol(protocol));
        
        return (0, 0, address(0));
    }

    /// @dev we assume it only has one LST token as collateral, and only ETH as debt
    function findCollAndDebtForAaveV3Position(
        address _user,
        address[] memory _collTokens
    ) public view returns (uint256 collAmount, uint256 debtAmount, address collToken) 
        {
        IPoolV3 lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);
        DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
            TokenUtils.WETH_ADDR
        );
        uint256 ethDebtAmount = wethReserveData.variableDebtTokenAddress.getBalance(_user);
        for (uint256 j = 0; j < _collTokens.length; j++) {
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                _collTokens[j]
            );
            if (reserveData.aTokenAddress != address(0)) {
                uint256 lstCollAmount = reserveData.aTokenAddress.getBalance(_user);
                if (lstCollAmount > 0) {
                    collAmount = lstCollAmount;
                    debtAmount = ethDebtAmount;
                    collToken = _collTokens[j];
                }
            }
        }
    }

    /// @dev we assume it only has one LST token as collateral, and only ETH as debt
    function findCollAndDebtForAaveV3LidoPosition(
        address _user,
        address[] memory _collTokens
    ) public view returns (uint256 collAmount, uint256 debtAmount, address collToken) 
        {
        IPoolV3 lendingPool = getLendingPool(0xcfBf336fe147D643B9Cb705648500e101504B16d);
        DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
            TokenUtils.WETH_ADDR
        );
        uint256 ethDebtAmount = wethReserveData.variableDebtTokenAddress.getBalance(_user);
        for (uint256 j = 0; j < _collTokens.length; j++) {
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                _collTokens[j]
            );
            if (reserveData.aTokenAddress != address(0)) {
                uint256 lstCollAmount = reserveData.aTokenAddress.getBalance(_user);
                if (lstCollAmount > 0) {
                    collAmount = lstCollAmount;
                    debtAmount = ethDebtAmount;
                    collToken = _collTokens[j];
                }
            }
        }
    }

    /// @dev we assume it only has one LST token as collateral, and only ETH as debt
    function findCollAndDebtForSparkPosition(
        address _user,
        address[] memory _collTokens
    ) public view returns (uint256 collAmount, uint256 debtAmount, address collToken) {
        IPoolV3 lendingPool = getLendingPool(DEFAULT_SPARK_MARKET);
        DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
            TokenUtils.WETH_ADDR
        );
        uint256 ethDebtAmount = wethReserveData.variableDebtTokenAddress.getBalance(_user);
        for (uint256 j = 0; j < _collTokens.length; j++) {
            DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                _collTokens[j]
            );
            if (reserveData.aTokenAddress != address(0)) {
                uint256 lstCollAmount = reserveData.aTokenAddress.getBalance(_user);
                if (lstCollAmount > 0) {
                    collAmount = lstCollAmount;
                    debtAmount = ethDebtAmount;
                    collToken = _collTokens[j];
                }
            }
        }
    }

    /// @dev we assume it only has one LST token as collateral, and only ETH as debt
    function findCollAndDebtForMorphoAaveV3Position(
        address _user,
        address[] memory _collTokens
    ) public view returns (uint256 collAmount, uint256 debtAmount, address collToken) {
        address morphoAddr = getMorphoAddressByEmode(1);
        uint256 debtBalance = IMorphoAaveV3(morphoAddr).borrowBalance(
            TokenUtils.WETH_ADDR,
            _user
        );

        for (uint256 j = 0; j < _collTokens.length; j++) {
            uint256 collBalance = IMorphoAaveV3(morphoAddr).collateralBalance(
                _collTokens[j],
                _user
            );
            if (collBalance > 0) {
                collAmount = collBalance;
                debtAmount = debtBalance;
                collToken = _collTokens[j];
            }
        }
    }

    /// @dev we assume it only has one LST token as collateral, and only ETH as debt
    function findCollAndDebtForCompV3Position(
        address _user,
        address[] memory _collTokens
    ) public view returns (uint256 collAmount, uint256 debtAmount, address collToken) {
        IComet comet = IComet(COMP_ETH_COMET);

        uint256 debtBalance = comet.borrowBalanceOf(_user);
        for (uint256 j = 0; j < _collTokens.length; j++) {
            uint256 collBalance = comet.collateralBalanceOf(_user, _collTokens[j]);
            if (collBalance > 0) {
                collAmount = collBalance;
                debtAmount = debtBalance;
                collToken = _collTokens[j];
            }
        }
    }
    /// @dev we assume it only has one LST token as collateral, and only ETH as debt
    function findCollAndDebtForMorphoBlueWstethPosition(address _user, Protocol protocol) public view returns (uint256, uint256, address) {
        MarketParams memory marketParams;
        if (protocol == Protocol.MORPHO_BLUE_WSTETH_MARKET_RATE) marketParams = _morphoBlueWstEthMarketRate();
        else if (protocol == Protocol.MORPHO_BLUE_WSTETH_LIDO_RATE_945) marketParams = _morphoBlueWstEthLidoRate945();
        else if (protocol == Protocol.MORPHO_BLUE_WSTETH_LIDO_RATE_965) marketParams = _morphoBlueWstEthLidoRate965();
        else if (protocol == Protocol.MORPHO_BLUE_WEETH_RATE_945) marketParams = _morphoBlueWeEth945();
        else if (protocol == Protocol.MORPHO_BLUE_WEETH_RATE_86) marketParams = _morphoBlueWeEth86();
        else if (protocol == Protocol.MORPHO_BLUE_EZETH_945) marketParams = _morphoBlueEzEth945();
        else if (protocol == Protocol.MORPHO_BLUE_EZETH_86) marketParams = _morphoBlueEzEth86();

        Id marketId = MarketParamsLib.id(marketParams);
        uint256 collBalance = MorphoLib.collateral(morphoBlue, marketId, _user);
        uint256 debtBalance = MorphoBalancesLib.expectedBorrowAssets(morphoBlue, marketParams, _user);
        return (collBalance, debtBalance, marketParams.collateralToken);
    }

    function _morphoBlueWstEthMarketRate() internal pure returns (MarketParams memory marketParams) {
        marketParams = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0x2a01EB9496094dA03c4E364Def50f5aD1280AD72,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945000000000000000
        });
    }
    function _morphoBlueWstEthLidoRate945() internal pure returns (MarketParams memory marketParams) {
        marketParams = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0xbD60A6770b27E084E8617335ddE769241B0e71D8,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945000000000000000
        });
    }
    function _morphoBlueWstEthLidoRate965() internal pure returns (MarketParams memory marketParams) {
        marketParams = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0xbD60A6770b27E084E8617335ddE769241B0e71D8,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 965000000000000000
        });
    }
     function _morphoBlueWeEth945() internal pure returns (MarketParams memory marketParams) {
        marketParams = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee,
            oracle: 0xbDd2F2D473E8D63d1BFb0185B5bDB8046ca48a72,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945000000000000000
        });
    }
    function _morphoBlueWeEth86() internal pure returns (MarketParams memory marketParams) {
        marketParams = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee,
            oracle: 0x3fa58b74e9a8eA8768eb33c8453e9C2Ed089A40a,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860000000000000000
        });
    }
    function _morphoBlueEzEth945() internal pure returns (MarketParams memory marketParams) {
        marketParams = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xbf5495Efe5DB9ce00f80364C8B423567e58d2110,
            oracle: 0x94f93f1eADb8a2f73C415AD4C19cB791e6D0192b,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945000000000000000
        });
    }
    function _morphoBlueEzEth86() internal pure returns (MarketParams memory marketParams) {
        marketParams = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0xbf5495Efe5DB9ce00f80364C8B423567e58d2110,
            oracle: 0x61025e2B0122ac8bE4e37365A4003d87ad888Cc3,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 860000000000000000
        });
    }

    /// @notice Returns the lending pool contract of the specified market
    function getLendingPool(address _market) override(AaveV3Helper, SparkHelper) internal view returns (IL2PoolV3) {
        return IL2PoolV3(IPoolAddressesProvider(_market).getPool());
    }

    /// @notice Fetch the data provider for the specified market
    function getDataProvider(address _market) override(AaveV3Helper, SparkHelper) internal view returns (IAaveProtocolDataProvider) {
        return
            IAaveProtocolDataProvider(
                IPoolAddressesProvider(_market).getPoolDataProvider()
            );
    }

    function boolToBytes(bool x) override(AaveV3Helper, SparkHelper) internal pure returns (bytes1 r) {
       return x ? bytes1(0x01) : bytes1(0x00);
    }

    function bytesToBool(bytes1 x) override(AaveV3Helper, SparkHelper) internal pure returns (bool r) {
        return x != bytes1(0x00);
    }
    
    function getWholeDebt(address _market, address _tokenAddr, uint256 _borrowType, address _debtOwner) override(AaveV3Helper, SparkHelper) internal view returns (uint256 debt) {
        uint256 STABLE_ID = 1;
        uint256 VARIABLE_ID = 2;

        IAaveProtocolDataProvider dataProvider = getDataProvider(_market);
        (, uint256 borrowsStable, uint256 borrowsVariable, , , , , , ) =
            dataProvider.getUserReserveData(_tokenAddr, _debtOwner);

        if (_borrowType == STABLE_ID) {
            debt = borrowsStable;
        } else if (_borrowType == VARIABLE_ID) {
            debt = borrowsVariable;
        }
    }
}
