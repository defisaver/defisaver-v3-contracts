// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../interfaces/exchange/ISwapRouter.sol";
import "../../../utils/TokenUtils.sol"; 
import "../../../l2-optimizations/AssetRegistry.sol";
import "../../../actions/ActionBase.sol";
import "./helpers/UniV3Helper.sol";
import "./helpers/UniV3ExchangeHelper.sol";

contract UniSellV3 is ActionBase, UniV3Helper, UniV3ExchangeHelper {
    using TokenUtils for address;

    bytes4 constant internal ASSET_REGISTRY_ID = 0xe2f63547;

    struct Params {
        address from; // address from which to pull input tokens
        address to; // address that will receive output tokens
        uint256 amount; // amount of input tokens to sell
        uint256 minOut; // minimum amount of output tokens to accept
        bool isCompressedPath;
        bytes path; // uniswap router path
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.from = _parseParamAddr(params.from, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.minOut = _parseParamUint(params.minOut, _paramMapping[3], _subData, _returnValues);

        if (params.isCompressedPath) {
            // skip struct offset slot, 5 arg slots, bytes offset slot and bytes length slot
            // skip trailing zero padding
            params.path = decompressPath(_callData[8 * 32: 8 * 32 + params.path.length]);
        }

        (uint256 amountOut, bytes memory logData) = _sell(params, RECIPE_FEE);
        emit ActionEvent("UniSellV3", logData);
        return bytes32(amountOut);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes calldata _callData) public virtual override payable {
        Params memory params = parseInputs(_callData);

        if (params.isCompressedPath) {
            // skip struct offset slot, 5 arg slots, bytes offset slot and bytes length slot
            // skip trailing zero padding
            params.path = decompressPath(_callData[8 * 32: 8 * 32 + params.path.length]);
        }
        (, bytes memory logData) = _sell(params, 0);
        logger.logActionDirectEvent("UniSellV3", logData);
    }

    /// @notice same functionality as the function above, uses custom gas saving encoding
    /// @dev see encodeInput() and decodeInput()
    function executeActionDirectL2() public payable {
        Params memory params = decodeInput(msg.data[4:]);
        (, bytes memory logData) = _sell(params, 0);
        logger.logActionDirectEvent("UniSellV3", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

    function encodeInput(Params calldata params) public pure returns (bytes memory) {
        return abi.encodePacked(
            params.from,
            params.to,
            params.amount,
            params.minOut,
            params.isCompressedPath,
            params.path
        );
    }

    function decodeInput(bytes calldata _data) public view returns (Params memory params) {
        params.from = address(bytes20(_data[:20]));
        params.to = address(bytes20(_data[20:40]));
        params.amount = uint256(bytes32(_data[40:72]));
        params.minOut = uint256(bytes32(_data[72:104]));
        params.isCompressedPath = bytes1(_data[104:105]) != 0x00;
        params.path = params.isCompressedPath ? decompressPath(_data[105:]) : _data[105:];
    }

    function compressPath(bytes calldata _path) public view returns (bytes memory compressedPath) {
        require((_path.length + 3) % 23 == 0, "Incorrect path format");
        uint256 pathAssetCount = (_path.length + 3) / 23;

        address assetRegistryAddr = registry.getAddr(ASSET_REGISTRY_ID);
        for (uint256 i = 0; i < pathAssetCount; i++) {
            address assetAddr = address(bytes20(_path[i * 23 : i * 23 + 20]));
            compressedPath = bytes.concat(
                compressedPath,
                AssetRegistry(assetRegistryAddr).assetId(assetAddr)
            );
            if (i == pathAssetCount - 1) break;
            compressedPath = bytes.concat(
                compressedPath,
                _path[i * 23 + 20 : i * 23 + 23]
            );
        }
    }

    function decompressPath(bytes calldata _compressedPath) public view returns (bytes memory path) {
        require((_compressedPath.length + 3) % 5 == 0, "Incorrect compressed path format");
        uint256 pathAssetCount = (_compressedPath.length + 3) / 5;
        address assetRegistryAddr = registry.getAddr(ASSET_REGISTRY_ID);

        for (uint256 i = 0; i < pathAssetCount; i++) {
            bytes2 assetId = bytes2(_compressedPath[i * 5 : i * 5 + 2]);
            path = bytes.concat(
                path,
                bytes20(AssetRegistry(assetRegistryAddr).assetAddr(assetId))
            );
            if (i == pathAssetCount - 1) break;
            path = bytes.concat(
                path,
                _compressedPath[i * 5 + 2 : i * 5 + 5]
            );
        }
    }

    function _sell(Params memory _params, uint256 _dfsFeeDivider) internal returns (uint256 amountOut, bytes memory logData) {
        address user = getUserAddress();
        address inputAsset = address(bytes20(_params.path));

        inputAsset.pullTokensIfNeeded(_params.from, _params.amount);
        if (_dfsFeeDivider != 0) {
            _params.amount = _params.amount - getFee(
                _params.amount,
                user,
                inputAsset,
                _dfsFeeDivider
            );
        }
        inputAsset.approveToken(UNI_V3_ROUTER, _params.amount);

        amountOut = ISwapRouter(UNI_V3_ROUTER).exactInput(
            ISwapRouter.ExactInputParams(
                _params.path,
                _params.to,
                block.timestamp,
                _params.amount,
                _params.minOut
            )
        );

        logData = abi.encode(amountOut);
    }
}