use starknet::ContractAddress;

/// Registry mapping (platform_id, commitment) -> wallet_address on Starknet.
///
/// Platform IDs and commitment keys are felt252 values derived by the backend
/// (sha256(input).slice(0..31) to stay within the felt252 range).
///
/// register_platform is permissionless — any caller can register a platform.
/// create / update / fetch all revert with 'Platform not registered' if the
/// platform_id has not been registered first.
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
    }
}
