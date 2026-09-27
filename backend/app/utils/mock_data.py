import csv
import os
from datetime import datetime, timedelta
import random

def generate_mock_data():
    output_dir = os.path.join(os.path.dirname(__file__), '../../mock_data')
    os.makedirs(output_dir, exist_ok=True)
    
    platforms = ['platform_alpha', 'platform_beta', 'platform_gamma']
    players = [f'player_{i}' for i in range(1, 16)]
    
    # 3 cross-hedging pairs
    cross_pairs = [
        ('player_1', 'player_2'),
        ('player_3', 'player_4'),
        ('player_5', 'player_6')
    ]
    
    # 1 bot account with fixed stake and regular timing
    bot_account = 'player_7'
    
    # 1 account with high win rate on Baccarat
    winner_account = 'player_8'
    
    # 1 syndicate group
    syndicate = ['player_9', 'player_10', 'player_11']
    
    # Start time
    start_time = datetime.now() - timedelta(days=5)
    
    for p in platforms:
        with open(os.path.join(output_dir, f"{p}.csv"), 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['round_id', 'player_id', 'game_type', 'bet_choice', 'stake', 'payout', 'bet_timestamp', 'result', 'table_id', 'provider'])
            
            for i in range(400):
                round_id = f"R{random.randint(1000, 1050)}"
                player = random.choice(players)
                game = random.choice(['BACCARAT', 'SICBO', 'ROULETTE'])
                stake = random.randint(10, 1000)
                choice = random.choice(['BANKER', 'PLAYER', 'BIG', 'SMALL'])
                payout = 0
                
                # Bot logic
                if player == bot_account:
                    stake = 500000
                    timestamp = start_time + timedelta(seconds=45 * i)
                else:
                    timestamp = start_time + timedelta(minutes=random.randint(1, 100))
                    
                # High win rate
                if player == winner_account and game == 'BACCARAT':
                    if random.random() < 0.78:
                        payout = stake * 1.95
                        
                # Cross hedging (force opposite)
                for pair in cross_pairs:
                    if player in pair:
                        game = 'BACCARAT'
                        other = pair[1] if player == pair[0] else pair[0]
                        choice = 'BANKER' if player == pair[0] else 'PLAYER'
                        writer.writerow([round_id, other, game, 'PLAYER' if choice == 'BANKER' else 'BANKER', stake, 0, timestamp.isoformat(), 'PENDING', 'T1', 'Evolution'])
                        break
                        
                # Syndicate
                if player in syndicate:
                    for s in syndicate:
                        if s != player:
                            writer.writerow([round_id, s, game, choice, stake, 0, timestamp.isoformat(), 'PENDING', 'T1', 'Evolution'])
                            
                writer.writerow([
                    round_id,
                    player,
                    game,
                    choice,
                    stake,
                    payout,
                    timestamp.isoformat(),
                    'PENDING',
                    'T1',
                    'Evolution'
                ])
                
if __name__ == '__main__':
    generate_mock_data()
    print("Mock data generated")
