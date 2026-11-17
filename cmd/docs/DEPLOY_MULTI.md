# deploy-multi handbook

`deploy-multi` builds, deploys and verifies zero-argument contracts on one or more networks without changing the repository network.

Supported networks are `mainnet`, `arbitrum`, `optimism`, `base`, `linea` and `plasma`.

Each contract gets an isolated compiler input. Progress is saved in a run manifest under `deployments/multi/runs`, so an interrupted run can continue without redeploying completed contracts. Successful deployments are also written to the matching file in `addresses`.

## Before deployment

Set the RPC URL and encrypted deployment key in `.env`. Verification also needs `ETHERSCAN_API_KEY`, unless it is skipped. The script prints the signer, gas cap and contracts before asking for confirmation on each network.

Gas values are caps in gwei. A deployment needs a gas cap unless the resumed manifest already has one saved.

## Deploy contracts

One contract on one network:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks base \
  --gas 1.1
```

Several contracts on the same networks:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper KyberAggregatorWrapper \
  --networks arbitrum,optimism,base \
  --gas 1.1
```

Different contract groups on different networks:

```sh
node ./cmd/deploy-multi.js \
  ZeroxWrapper,KyberAggregatorWrapper@arbitrum,optimism,base,linea,plasma \
  OneInchWrapper@arbitrum,optimism,base,linea \
  PendleWrapper@plasma \
  --gas all=1.1
```

Use every supported network. `@all` can also be used inside a contract group.

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks all \
  --gas all=1.1
```

`--networks` is the default for contract names without `@networks`. Groups with their own network list override that default. Repeated contract and network pairs are deployed only once.

For example, this deploys `ZeroxWrapper` everywhere and `PendleWrapper` only on Plasma:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper PendleWrapper@plasma \
  --networks all \
  --gas all=1.1
```

## Gas settings

Use one cap for every selected network:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks arbitrum,base \
  --gas 1.1
```

Use a common cap with a network override:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks mainnet,arbitrum,base \
  --gas all=1.1,mainnet=3
```

Use a separate cap for each network:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks mainnet,base \
  --gas mainnet=3,base=0.01
```

## Verification

### Submit and continue

This is the default mode. The script submits verification, saves the explorer job ID and exits after the explorer accepts the request. Verification continues in the explorer queue.

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks base \
  --gas 1.1 \
  --verification submit
```

No follow-up command is required. To check all pending jobs and update the manifest later, use:

```sh
node ./cmd/deploy-multi.js \
  --resume deployments/multi/runs/1794922061510-3569c014.json \
  --verification wait
```

### Wait for verification

Use `wait` when the command should stay open until every contract is exact-verified or the timeout is reached. Explorer checks run concurrently.

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks linea \
  --gas 1.1 \
  --verification wait
```

### Skip verification

Use `skip` when only deployment is needed. Verification can still be submitted later by resuming the run.

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks plasma \
  --gas 1.1 \
  --verification skip
```

Submit verification later:

```sh
node ./cmd/deploy-multi.js \
  --resume deployments/multi/runs/1794922061510-3569c014.json \
  --verification submit
```

### Export files for manual verification

Export one Solidity Standard JSON input per contract. This does not connect to an RPC or send transactions.

```sh
node ./cmd/deploy-multi.js \
  --resume deployments/multi/runs/1794922061510-3569c014.json \
  --export-verification ./verification-inputs
```

## Build and resume

Build everything and create a manifest without connecting to an RPC:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper,OneInchWrapper \
  --networks arbitrum,base \
  --build-only
```

Deploy from that manifest:

```sh
node ./cmd/deploy-multi.js \
  --resume deployments/multi/runs/1794922061510-3569c014.json \
  --gas all=1.1
```

The same `--resume` command continues an interrupted deployment. Confirmed contracts are not deployed again.

When resuming, do not pass contract names, `--networks`, `--source-tag` or `--output`. Those values are already fixed in the manifest.

## Deployment controls

### Source tag

A source tag creates fresh compiler metadata without changing executable runtime logic. Use it when redeploying a contract that already has identical bytecode and you need a new exact verification instead of an explorer Similar Match.

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks mainnet \
  --source-tag mainnet-clean-v1 \
  --gas 1.1
```

Tags may contain letters, numbers, dots, dashes and underscores, up to 64 characters.

### Duplicate bytecode

The script normally stops if the same runtime bytecode already exists in the network address history. Allow it only when that duplicate deployment is intentional:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks base \
  --gas 1.1 \
  --allow-duplicate-bytecode
```

### Confirmations

Wait for more block confirmations before submitting verification:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks mainnet \
  --gas 1.1 \
  --confirmations 3
```

### Timeout

Change the receipt and verification timeout from the default 300 seconds:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks linea \
  --gas 1.1 \
  --timeout 600
```

### Output directory

Store builds and run manifests in a different directory:

```sh
node ./cmd/deploy-multi.js ZeroxWrapper \
  --networks base \
  --build-only \
  --output ./deployments/release-2026-11
```

### Help

Show the command help:

```sh
node ./cmd/deploy-multi.js --help
```

## Option reference

| Option | Purpose |
| --- | --- |
| `--networks <list>` | Default network list, or `all` |
| `--gas <prices>` | Gas cap for all networks or per-network caps |
| `--verification <mode>` | `submit`, `wait` or `skip`. Defaults to `submit` |
| `--build-only` | Build and save a manifest without RPC calls |
| `--resume <manifest>` | Continue a saved run |
| `--source-tag <tag>` | Create fresh metadata for a new exact deployment |
| `--allow-duplicate-bytecode` | Permit an intentional duplicate runtime deployment |
| `--export-verification <directory>` | Export Standard JSON verification inputs |
| `--confirmations <count>` | Required receipt confirmations. Defaults to `1` |
| `--timeout <seconds>` | Receipt or verification timeout. Defaults to `300` |
| `--output <directory>` | Build cache and manifest directory |
| `--help` | Print CLI help |
