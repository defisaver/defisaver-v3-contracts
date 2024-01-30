// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
import "../utils/LSVProxyRegistry.sol";
import "../utils/TokenUtils.sol";
import "../utils/DFSProxyRegistry.sol";

import "../actions/utils/helpers/ActionsUtilHelper.sol";
import "../actions/aaveV3/helpers/AaveV3Helper.sol";
import "../actions/morpho/aaveV3/helpers/MorphoAaveV3Helper.sol";
import "../actions/compoundV3/helpers/CompV3Helper.sol";
import "../actions/morpho-blue/helpers/MorphoBlueHelper.sol";
import "../utils/helpers/UtilHelper.sol";
import "../actions/lsv/helpers/LSVUtilHelper.sol";
import "../utils/LSVProfitTracker.sol";
import "../actions/spark/helpers/SparkHelper.sol";

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
        MORPHO_BLUE_WSTETH
    }

    uint256 public constant NUMBER_OF_SUPPORTED_PROTOCOLS = 5;
    
    using TokenUtils for address;

    function getAllPositionForLSVUser(
        address _user,
        address[] memory _collTokens
    ) public view returns (address[] memory proxies, Position[] memory positions) {
        proxies = LSVProxyRegistry(LSV_PROXY_REGISTRY_ADDRESS).getProxies(_user);
        Position[] memory tempPositions = new Position[](proxies.length * NUMBER_OF_SUPPORTED_PROTOCOLS);
        uint256 positionCounter;

        for (uint i = 0; i < proxies.length; i++) {
            // Aave position
            {
                IPoolV3 lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);
                DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
                    TokenUtils.WETH_ADDR
                );
                for (uint j = 0; j < _collTokens.length; j++) {
                    DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                        _collTokens[j]
                    );
                    if (reserveData.aTokenAddress != address(0)) {
                        uint256 collBalance = reserveData.aTokenAddress.getBalance(proxies[i]);
                        if (collBalance > 0) {
                            uint256 debtBalance = wethReserveData
                                .variableDebtTokenAddress
                                .getBalance(proxies[i]);
                            tempPositions[positionCounter++] = Position(
                                uint8(Protocol.AAVE_V3),
                                proxies[i],
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
                for (uint j = 0; j < _collTokens.length; j++) {
                    uint256 collBalance = IMorphoAaveV3(morphoAddr).collateralBalance(
                        _collTokens[j],
                        proxies[i]
                    );
                    if (collBalance > 0) {
                        uint256 debtBalance = IMorphoAaveV3(morphoAddr).borrowBalance(
                            TokenUtils.WETH_ADDR,
                            proxies[i]
                        );
                        tempPositions[positionCounter++] = Position(
                            uint8(Protocol.MORPHO_AAVE_V3),
                            proxies[i],
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
                for (uint j = 0; j < _collTokens.length; j++) {
                    uint256 collBalance = comet.collateralBalanceOf(proxies[i], _collTokens[j]);
                    if (collBalance > 0) {
                        uint256 debtBalance = comet.borrowBalanceOf(proxies[i]);
                        tempPositions[positionCounter++] = Position(
                            uint8(Protocol.COMPOUND_V3),
                            proxies[i],
                            _collTokens[j],
                            TokenUtils.WETH_ADDR,
                            collBalance,
                            debtBalance
                        );
                        j = _collTokens.length;
                    }
                }
            }
            // Spark Position
            {
                IPoolV3 lendingPool = getLendingPool(DEFAULT_SPARK_MARKET);
                DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
                    TokenUtils.WETH_ADDR
                );
                for (uint j = 0; j < _collTokens.length; j++) {
                    DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                        _collTokens[j]
                    );
                    if (reserveData.aTokenAddress != address(0)) {
                        uint256 collBalance = reserveData.aTokenAddress.getBalance(proxies[i]);
                        if (collBalance > 0) {
                            uint256 debtBalance = wethReserveData
                                .variableDebtTokenAddress
                                .getBalance(proxies[i]);
                            tempPositions[positionCounter++] = Position(
                                uint8(Protocol.SPARK),
                                proxies[i],
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
            // MorphoBlue wsteth/eth market
            {       
                MarketParams memory marketParams = MarketParams({
                    loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
                    collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
                    oracle: 0x2a01EB9496094dA03c4E364Def50f5aD1280AD72,
                    irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
                    lltv: 945000000000000000
                });
                Id marketId = MarketParamsLib.id(marketParams);
                if (MorphoLib.collateral(morphoBlue, marketId, proxies[i]) > 0){
                    tempPositions[positionCounter++] = Position(
                        uint8(Protocol.MORPHO_BLUE_WSTETH),
                        proxies[i],
                        marketParams.collateralToken,
                        TokenUtils.WETH_ADDR,
                        MorphoLib.collateral(morphoBlue, marketId, proxies[i]),
                        MorphoBalancesLib.expectedBorrowAssets(morphoBlue, marketParams, proxies[i])
                    );
                }
            }
        }
        
        positions = new Position[](positionCounter);
        for (uint i = 0; i < positionCounter; i++) {
            positions[i] = tempPositions[i];
        }
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

        Position[] memory tempPositions = new Position[](proxies.length * NUMBER_OF_SUPPORTED_PROTOCOLS);
        uint256 positionCounter;

        for (uint i = 0; i < proxies.length; i++) {
            // Aave position
            {
                IPoolV3 lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);
                DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
                    TokenUtils.WETH_ADDR
                );
                for (uint j = 0; j < _collTokens.length; j++) {
                    DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                        _collTokens[j]
                    );
                    if (reserveData.aTokenAddress != address(0)) {
                        uint256 collBalance = reserveData.aTokenAddress.getBalance(proxies[i]);
                        if (collBalance > 0) {
                            uint256 debtBalance = wethReserveData
                                .variableDebtTokenAddress
                                .getBalance(proxies[i]);
                            tempPositions[positionCounter++] = Position(
                                uint8(Protocol.AAVE_V3),
                                proxies[i],
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
                for (uint j = 0; j < _collTokens.length; j++) {
                    uint256 collBalance = IMorphoAaveV3(morphoAddr).collateralBalance(
                        _collTokens[j],
                        proxies[i]
                    );
                    if (collBalance > 0) {
                        uint256 debtBalance = IMorphoAaveV3(morphoAddr).borrowBalance(
                            TokenUtils.WETH_ADDR,
                            proxies[i]
                        );
                        tempPositions[positionCounter++] = Position(
                            uint8(Protocol.MORPHO_AAVE_V3),
                            proxies[i],
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
                for (uint j = 0; j < _collTokens.length; j++) {
                    uint256 collBalance = comet.collateralBalanceOf(proxies[i], _collTokens[j]);
                    if (collBalance > 0) {
                        uint256 debtBalance = comet.borrowBalanceOf(proxies[i]);
                        tempPositions[positionCounter++] = Position(
                            uint8(Protocol.COMPOUND_V3),
                            proxies[i],
                            _collTokens[j],
                            TokenUtils.WETH_ADDR,
                            collBalance,
                            debtBalance
                        );
                        j = _collTokens.length;
                    }
                }
            }
            // SPARK position
            {
                IPoolV3 lendingPool = getLendingPool(DEFAULT_SPARK_MARKET);
                DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
                    TokenUtils.WETH_ADDR
                );
                for (uint j = 0; j < _collTokens.length; j++) {
                    DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                        _collTokens[j]
                    );
                    if (reserveData.aTokenAddress != address(0)) {
                        uint256 collBalance = reserveData.aTokenAddress.getBalance(proxies[i]);
                        if (collBalance > 0) {
                            uint256 debtBalance = wethReserveData
                                .variableDebtTokenAddress
                                .getBalance(proxies[i]);
                            tempPositions[positionCounter++] = Position(
                                uint8(Protocol.SPARK),
                                proxies[i],
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

            // MorphoBlue wsteth/eth market
            {       
                MarketParams memory marketParams = MarketParams({
                    loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
                    collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
                    oracle: 0x2a01EB9496094dA03c4E364Def50f5aD1280AD72,
                    irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
                    lltv: 945000000000000000
                });
                Id marketId = MarketParamsLib.id(marketParams);
                if (MorphoLib.collateral(morphoBlue, marketId, proxies[i]) > 0){
                    tempPositions[positionCounter++] = Position(
                        uint8(Protocol.MORPHO_BLUE_WSTETH),
                        proxies[i],
                        marketParams.collateralToken,
                        TokenUtils.WETH_ADDR,
                        MorphoLib.collateral(morphoBlue, marketId, proxies[i]),
                        MorphoBalancesLib.expectedBorrowAssets(morphoBlue, marketParams, proxies[i])
                    );
                }
            }
        }
        positions = new Position[](positionCounter);
        for (uint i = 0; i < positionCounter; i++) {
            positions[i] = tempPositions[i];
        }
    }

    /// @dev fetching data until we find first LST/ETH position for each protocol
    function getAllPositionForEOA(
        address _user,
        address[] memory _collTokens
    ) public view returns (address[] memory proxies, Position[] memory positions) {
        Position[] memory tempPositions = new Position[](NUMBER_OF_SUPPORTED_PROTOCOLS);
        uint256 positionCounter;

        // Aave position
        {
            IPoolV3 lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);
            DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
                TokenUtils.WETH_ADDR
            );
            for (uint j = 0; j < _collTokens.length; j++) {
                DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                    _collTokens[j]
                );
                if (reserveData.aTokenAddress != address(0)) {
                    uint256 collBalance = reserveData.aTokenAddress.getBalance(_user);
                    if (collBalance > 0) {
                        uint256 debtBalance = wethReserveData.variableDebtTokenAddress.getBalance(
                            _user
                        );
                        tempPositions[positionCounter++] = Position(
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
            for (uint j = 0; j < _collTokens.length; j++) {
                uint256 collBalance = IMorphoAaveV3(morphoAddr).collateralBalance(
                    _collTokens[j],
                    _user
                );
                if (collBalance > 0) {
                    uint256 debtBalance = IMorphoAaveV3(morphoAddr).borrowBalance(
                        TokenUtils.WETH_ADDR,
                        _user
                    );
                    tempPositions[positionCounter++] = Position(
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
            for (uint j = 0; j < _collTokens.length; j++) {
                uint256 collBalance = comet.collateralBalanceOf(_user, _collTokens[j]);
                if (collBalance > 0) {
                    uint256 debtBalance = comet.borrowBalanceOf(_user);
                    tempPositions[positionCounter++] = Position(
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
        // Spark position
        {
            IPoolV3 lendingPool = getLendingPool(DEFAULT_SPARK_MARKET);
            DataTypes.ReserveData memory wethReserveData = lendingPool.getReserveData(
                TokenUtils.WETH_ADDR
            );
            for (uint j = 0; j < _collTokens.length; j++) {
                DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(
                    _collTokens[j]
                );
                if (reserveData.aTokenAddress != address(0)) {
                    uint256 collBalance = reserveData.aTokenAddress.getBalance(_user);
                    if (collBalance > 0) {
                        uint256 debtBalance = wethReserveData.variableDebtTokenAddress.getBalance(
                            _user
                        );
                        tempPositions[positionCounter++] = Position(
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
        // MorphoBlue wsteth/eth market
        {       
            MarketParams memory marketParams = MarketParams({
                loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
                collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
                oracle: 0x2a01EB9496094dA03c4E364Def50f5aD1280AD72,
                irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
                lltv: 945000000000000000
            });
            Id marketId = MarketParamsLib.id(marketParams);
            if (MorphoLib.collateral(morphoBlue, marketId, _user) > 0){
                tempPositions[positionCounter++] = Position(
                    uint8(Protocol.MORPHO_BLUE_WSTETH),
                    _user,
                    marketParams.collateralToken,
                    TokenUtils.WETH_ADDR,
                    MorphoLib.collateral(morphoBlue, marketId, _user),
                    MorphoBalancesLib.expectedBorrowAssets(morphoBlue, marketParams, _user)
                );
            }
            
        }
        positions = new Position[](positionCounter);
        proxies = new address[](positionCounter);
        for (uint i = 0; i < positionCounter; i++) {
            positions[i] = tempPositions[i];
            proxies[i] = tempPositions[i].proxy;
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
        if (protocol == uint8(Protocol.MORPHO_BLUE_WSTETH)) return findCollAndDebtForMorphoBlueWstethPosition(_user);
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
        for (uint j = 0; j < _collTokens.length; j++) {
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
        for (uint j = 0; j < _collTokens.length; j++) {
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

        for (uint j = 0; j < _collTokens.length; j++) {
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
        for (uint j = 0; j < _collTokens.length; j++) {
            uint256 collBalance = comet.collateralBalanceOf(_user, _collTokens[j]);
            if (collBalance > 0) {
                collAmount = collBalance;
                debtAmount = debtBalance;
                collToken = _collTokens[j];
            }
        }
    }
    /// @dev we assume it only has one LST token as collateral, and only ETH as debt
    function findCollAndDebtForMorphoBlueWstethPosition(address _user) public view returns (uint256, uint256, address) {
        MarketParams memory marketParams = MarketParams({
            loanToken: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            collateralToken: 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0,
            oracle: 0x2a01EB9496094dA03c4E364Def50f5aD1280AD72,
            irm: 0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC,
            lltv: 945000000000000000
        });
        Id marketId = MarketParamsLib.id(marketParams);
        uint256 collBalance = MorphoLib.collateral(morphoBlue, marketId, _user);
        uint256 debtBalance = MorphoBalancesLib.expectedBorrowAssets(morphoBlue, marketParams, _user);
        return (collBalance, debtBalance, marketParams.collateralToken);
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
    
    function getWholeDebt(address _market, address _tokenAddr, uint _borrowType, address _debtOwner) override(AaveV3Helper, SparkHelper) internal view returns (uint256 debt) {
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
