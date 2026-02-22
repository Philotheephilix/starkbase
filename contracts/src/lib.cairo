use starknet::ContractAddress;

/// Registry mapping (platform_id, commitment) -> wallet_address on Starknet.
///
/// Platform IDs and commitment keys are felt252 values derived by the backend
/// (sha256(input).slice(0..31) to stay within the felt252 range).
///
/// register_platform is permissionless — any caller can register a platform.
/// create / update / fetch / get_commitments all revert with 'Platform not registered'
/// if the platform_id has not been registered first.
#[starknet::interface]
pub trait IStarkbaseRegistry<TContractState> {
    fn register_platform(ref self: TContractState, platform_id: felt252);
    fn create(
        ref self: TContractState,
        platform_id: felt252,
        wallet_address: ContractAddress,
        commitment: felt252,
    );
    fn update(
        ref self: TContractState,
        platform_id: felt252,
        commitment: felt252,
        wallet_address: ContractAddress,
    );
    fn fetch(
        self: @TContractState, platform_id: felt252, commitment: felt252,
    ) -> ContractAddress;
    fn is_registered(self: @TContractState, platform_id: felt252) -> bool;
    /// Returns all commitment keys stored under a platform, in insertion order.
    /// Reverts if the platform is not registered.
    fn get_commitments(self: @TContractState, platform_id: felt252) -> Array<felt252>;
    fn get_commitment_count(self: @TContractState, platform_id: felt252) -> u64;
}

#[starknet::contract]
pub mod StarkbaseRegistry {
    use starknet::ContractAddress;
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};

    #[storage]
    struct Storage {
        /// platform_id -> is_registered
        platforms: Map<felt252, bool>,
        /// (platform_id, commitment) -> wallet_address
        records: Map<(felt252, felt252), ContractAddress>,
        /// platform_id -> number of unique commitments stored
        commitment_count: Map<felt252, u64>,
        /// (platform_id, index) -> commitment_key  (insertion-order list)
        commitment_list: Map<(felt252, u64), felt252>,
        /// (platform_id, commitment) -> already indexed (dedup guard)
        commitment_indexed: Map<(felt252, felt252), bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        PlatformRegistered: PlatformRegistered,
        RecordCreated: RecordCreated,
        RecordUpdated: RecordUpdated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct PlatformRegistered {
        #[key]
        pub platform_id: felt252,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RecordCreated {
        #[key]
        pub platform_id: felt252,
        #[key]
        pub commitment: felt252,
        pub wallet_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    pub struct RecordUpdated {
        #[key]
        pub platform_id: felt252,
        #[key]
        pub commitment: felt252,
        pub wallet_address: ContractAddress,
    }

    #[abi(embed_v0)]
    impl StarkbaseRegistryImpl of super::IStarkbaseRegistry<ContractState> {
        fn register_platform(ref self: ContractState, platform_id: felt252) {
            self.platforms.write(platform_id, true);
            self.emit(PlatformRegistered { platform_id });
        }

        fn create(
            ref self: ContractState,
            platform_id: felt252,
            wallet_address: ContractAddress,
            commitment: felt252,
        ) {
            assert(self.platforms.read(platform_id), 'Platform not registered');
            self.records.write((platform_id, commitment), wallet_address);

            // Append to the insertion-order list only if not already indexed
            if !self.commitment_indexed.read((platform_id, commitment)) {
                let idx = self.commitment_count.read(platform_id);
                self.commitment_list.write((platform_id, idx), commitment);
                self.commitment_count.write(platform_id, idx + 1);
                self.commitment_indexed.write((platform_id, commitment), true);
            }

            self.emit(RecordCreated { platform_id, commitment, wallet_address });
        }

        fn update(
            ref self: ContractState,
            platform_id: felt252,
            commitment: felt252,
            wallet_address: ContractAddress,
        ) {
            assert(self.platforms.read(platform_id), 'Platform not registered');
            self.records.write((platform_id, commitment), wallet_address);
            self.emit(RecordUpdated { platform_id, commitment, wallet_address });
        }

        fn fetch(
            self: @ContractState, platform_id: felt252, commitment: felt252,
        ) -> ContractAddress {
            assert(self.platforms.read(platform_id), 'Platform not registered');
            self.records.read((platform_id, commitment))
        }

        fn is_registered(self: @ContractState, platform_id: felt252) -> bool {
            self.platforms.read(platform_id)
        }

        fn get_commitments(self: @ContractState, platform_id: felt252) -> Array<felt252> {
            assert(self.platforms.read(platform_id), 'Platform not registered');
            let count = self.commitment_count.read(platform_id);
            let mut result: Array<felt252> = array![];
            let mut i: u64 = 0;
            while i < count {
                result.append(self.commitment_list.read((platform_id, i)));
                i += 1;
            };
            result
        }

        fn get_commitment_count(self: @ContractState, platform_id: felt252) -> u64 {
            self.commitment_count.read(platform_id)
        }
    }
}
