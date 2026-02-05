<?php
$host = 'localhost';
$db = 'gwcirculair_dpp';
$user = 'gwcirculair_dpp';
$pass = 'vEAp30yZ(C.';

$gtin = isset($_GET['gtin']) ? $_GET['gtin'] : '';

if (empty($gtin)) {
    header("HTTP/1.0 404 Not Found");
    echo "<h1>Product niet gevonden</h1><p>Geen GTIN opgegeven.</p>";
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->prepare("SELECT * FROM products WHERE gtin = ?");
    $stmt->execute([$gtin]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        header("HTTP/1.0 404 Not Found");
        echo "<h1>Product niet gevonden</h1><p>GTIN: " . htmlspecialchars($gtin) . "</p>";
        exit;
    }
} catch(PDOException $e) {
    header("HTTP/1.0 500 Internal Server Error");
    echo "<h1>Database fout</h1>";
    exit;
}

$materials = json_decode($product['materials'] ?? '[]', true) ?: [];
$careSymbols = json_decode($product['care_symbols'] ?? '[]', true) ?: [];
$carbonBreakdown = json_decode($product['carbon_footprint_breakdown'] ?? '{}', true) ?: [];
?>
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($product['name']); ?> - Digitaal Product Paspoort</title>
    <meta name="description" content="Digitaal Product Paspoort voor <?php echo htmlspecialchars($product['name']); ?> - EU ESPR compliant duurzaamheidsinformatie">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
            margin-bottom: 20px;
        }
        .header {
            background: linear-gradient(135deg, #2D5A27 0%, #4A7C59 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 1.8rem; margin-bottom: 10px; }
        .header .gtin { 
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-family: monospace;
            display: inline-block;
        }
        .section { padding: 24px; border-bottom: 1px solid #eee; }
        .section:last-child { border-bottom: none; }
        .section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #2D5A27;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .stat {
            background: #f8f9fa;
            padding: 16px;
            border-radius: 12px;
            text-align: center;
        }
        .stat-value { font-size: 2rem; font-weight: 700; color: #2D5A27; }
        .stat-label { font-size: 0.85rem; color: #666; margin-top: 4px; }
        .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            margin: 4px;
        }
        .badge-green { background: #d4edda; color: #155724; }
        .badge-blue { background: #cce5ff; color: #004085; }
        .progress-bar {
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 8px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #2D5A27, #4A7C59);
            border-radius: 4px;
        }
        .care-symbols { display: flex; flex-wrap: wrap; gap: 12px; }
        .care-symbol {
            width: 50px;
            height: 50px;
            background: #f0f0f0;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.85rem;
        }
        .eu-badge {
            background: #003399;
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 20px;
        }
        @media (max-width: 600px) {
            .header h1 { font-size: 1.4rem; }
            .stat-value { font-size: 1.5rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <h1><?php echo htmlspecialchars($product['name']); ?></h1>
                <div class="gtin">GTIN: <?php echo htmlspecialchars($product['gtin']); ?></div>
                <div class="eu-badge">
                    <span>🇪🇺</span>
                    <span>EU ESPR Compliant</span>
                </div>
            </div>

            <?php if ($product['description']): ?>
            <div class="section">
                <div class="section-title">📋 Beschrijving</div>
                <p><?php echo nl2br(htmlspecialchars($product['description'])); ?></p>
            </div>
            <?php endif; ?>

            <div class="section">
                <div class="section-title">♻️ Duurzaamheidsscores</div>
                <div class="grid">
                    <?php if ($product['repairability_index']): ?>
                    <div class="stat">
                        <div class="stat-value"><?php echo $product['repairability_index']; ?>/10</div>
                        <div class="stat-label">Repareerbaarheid</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?php echo $product['repairability_index'] * 10; ?>%"></div>
                        </div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($product['durability_score']): ?>
                    <div class="stat">
                        <div class="stat-value"><?php echo $product['durability_score']; ?>/10</div>
                        <div class="stat-label">Duurzaamheid</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?php echo $product['durability_score'] * 10; ?>%"></div>
                        </div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($product['sustainability_score']): ?>
                    <div class="stat">
                        <div class="stat-value"><?php echo number_format($product['sustainability_score'], 1); ?></div>
                        <div class="stat-label">Duurzaamheidsscore</div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <div class="section">
                <div class="section-title">🌍 Milieu Impact</div>
                <div class="grid">
                    <?php if ($product['carbon_footprint']): ?>
                    <div class="stat">
                        <div class="stat-value"><?php echo number_format($product['carbon_footprint'], 1); ?></div>
                        <div class="stat-label">kg CO₂ Voetafdruk</div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($product['water_footprint_liters']): ?>
                    <div class="stat">
                        <div class="stat-value"><?php echo number_format($product['water_footprint_liters']); ?></div>
                        <div class="stat-label">Liter Water</div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($product['renewable_energy_percentage']): ?>
                    <div class="stat">
                        <div class="stat-value"><?php echo $product['renewable_energy_percentage']; ?>%</div>
                        <div class="stat-label">Hernieuwbare Energie</div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($product['microplastic_shedding_estimated']): ?>
                    <div class="stat">
                        <div class="stat-value"><?php echo number_format($product['microplastic_shedding_estimated']); ?></div>
                        <div class="stat-label">mg Microplastics/was</div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>

            <?php if (!empty($materials)): ?>
            <div class="section">
                <div class="section-title">🧵 Materialen</div>
                <div>
                    <?php foreach ($materials as $material): ?>
                    <span class="badge badge-green"><?php echo htmlspecialchars($material); ?></span>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>

            <?php if (!empty($careSymbols)): ?>
            <div class="section">
                <div class="section-title">🏷️ Verzorgingsinstructies</div>
                <div class="care-symbols">
                    <?php 
                    $symbolMap = [
                        'wash_30' => '🌡️30°',
                        'wash_40' => '🌡️40°',
                        'wash_60' => '🌡️60°',
                        'no_bleach' => '🚫🧴',
                        'tumble_dry_low' => '🔥⬇️',
                        'iron_low' => '🔥⬇️🔥',
                        'dry_clean' => '🧹',
                    ];
                    foreach ($careSymbols as $symbol): 
                        $display = isset($symbolMap[$symbol]) ? $symbolMap[$symbol] : $symbol;
                    ?>
                    <div class="care-symbol" title="<?php echo htmlspecialchars($symbol); ?>">
                        <?php echo $display; ?>
                    </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <div class="footer">
            <p>Digitaal Product Paspoort gegenereerd door</p>
            <p><strong>Groningen Werkt Circulair</strong></p>
            <p style="margin-top: 10px;">
                Laatste update: <?php echo date('d-m-Y H:i', strtotime($product['updated_at'] ?? $product['created_at'])); ?>
            </p>
        </div>
    </div>
</body>
</html>
